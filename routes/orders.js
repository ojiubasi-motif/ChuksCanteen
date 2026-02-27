import express from 'express';
import mongoose from 'mongoose';
import { Order, OrderItem } from '../models/order.js';
import FoodItem from '../models/foodItem.js';

const router = express.Router();

// Create order
router.post('/orders', async (req, res) => {
    const { userId, items, notes } = req.body;
    if (!userId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ msg: 'missing payload', type: 'WRONG_OR_MISSING_PAYLOAD', code: 606 });
    }

    try {
        // validate items and calculate prices
        const validations = await Promise.all(items.map(async (it) => {
            const fi = await FoodItem.findById(it.foodItemId).lean();
            if (!fi || !fi.available) return { ok: false, id: it.foodItemId, reason: 'unavailable' };
            const unitPrice = fi.price;
            return { ok: true, id: it.foodItemId, qty: it.qty, unitPrice };
        }));

        const bad = validations.find(v => !v.ok);
        if (bad) return res.status(409).json({ msg: 'item unavailable', item: bad.id, type: 'ITEM_UNAVAILABLE' });

        const orderItems = validations.map(v => ({ foodItemId: mongoose.Types.ObjectId(v.id), qty: v.qty, unitPrice: v.unitPrice }));
        const subtotal = orderItems.reduce((s, it) => s + (it.qty * it.unitPrice), 0);
        const tax = 0;
        const total = subtotal + tax;

        const order = new Order({ userId, items: orderItems, subtotal, tax, total, status: 'pending', paymentStatus: 'pending', notes });
        await order.save();

        return res.status(201).json({ msg: 'order created', data: { orderId: order._id, status: order.status }, type: 'SUCCESS' });
    } catch (err) {
        return res.status(500).json({ msg: err?.message || err, type: 'FAILED', code: 602 });
    }
});

// Get order by id
router.get('/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('items.foodItemId').lean();
        if (!order) return res.status(404).json({ msg: 'order not found', type: 'NOT_FOUND', code: 604 });
        return res.status(200).json({ msg: 'success', data: order });
    } catch (err) {
        return res.status(500).json({ msg: err?.message || err, type: 'FAILED', code: 602 });
    }
});

// List orders (filter by userId query or admin all)
router.get('/orders', async (req, res) => {
    const { userId } = req.query;
    try {
        const q = userId ? { userId } : {};
        const orders = await Order.find(q).sort({ createdAt: -1 }).lean();
        return res.status(200).json({ msg: 'success', data: orders });
    } catch (err) {
        return res.status(500).json({ msg: err?.message || err, type: 'FAILED', code: 602 });
    }
});

// Update order status (admin or allowed customer actions)
router.patch('/orders/:id/status', async (req, res) => {
    const { status, admin } = req.body;
    if (!status) return res.status(400).json({ msg: 'missing status', type: 'WRONG_OR_MISSING_PAYLOAD', code: 606 });
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ msg: 'order not found', type: 'NOT_FOUND', code: 604 });

        const allowed = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'completed', 'cancelled'];
        if (!allowed.includes(status)) return res.status(400).json({ msg: 'invalid status' });

        // if not admin, only allow cancelling when order in pending/confirmed
        if (!admin) {
            if (status === 'cancelled') {
                if (!['pending', 'confirmed'].includes(order.status)) return res.status(403).json({ msg: 'cannot cancel at this stage' });
            } else {
                return res.status(403).json({ msg: 'only admin can set this status' });
            }
        }

        order.status = status;
        await order.save();
        return res.status(200).json({ msg: 'status updated', data: { id: order._id, status: order.status } });
    } catch (err) {
        return res.status(500).json({ msg: err?.message || err, type: 'FAILED', code: 602 });
    }
});

// Cancel order (helper)
router.post('/orders/:id/cancel', async (req, res) => {
    const { admin } = req.body;
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ msg: 'order not found', type: 'NOT_FOUND', code: 604 });
        if (!admin) {
            if (!['pending', 'confirmed'].includes(order.status)) return res.status(403).json({ msg: 'cannot cancel at this stage' });
        }
        order.status = 'cancelled';
        await order.save();
        return res.status(200).json({ msg: 'order cancelled', data: { id: order._id } });
    } catch (err) {
        return res.status(500).json({ msg: err?.message || err, type: 'FAILED', code: 602 });
    }
});

export default router;
