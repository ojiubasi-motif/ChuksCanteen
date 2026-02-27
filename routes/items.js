import express from 'express';
import FoodItem from '../models/foodItem.js';
import verifyToken,{isAdmin} from '../middleware/verification.js';

const router = express.Router();

// list items
router.get('/items', async (req, res) => {
  try {
    const items = await FoodItem.find({ available: true });
    res.status(200).json({ msg: 'success', data: items });
  } catch (err) {
    res.status(500).json({ msg: err?.message || err });
  }
});

// get item
router.get('/items/:id', async (req, res) => {
  try {
    const item = await FoodItem.findById(req.params.id);
    if (!item) return res.status(404).json({ msg: 'not found' });
    res.status(200).json({ msg: 'success', data: item });
  } catch (err) {
    res.status(500).json({ msg: err?.message || err });
  }
});

// create item (admin)
router.post('/items',  verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, description, price, available, tags, imageUrl } = req.body;
    const newItem = new FoodItem({ name, description, price, available, tags, imageUrl });
    await newItem.save();
    res.status(201).json({ msg: 'created', data: newItem });
  } catch (err) {
    res.status(500).json({ msg: err?.message || err });
  }
});

// update item (admin)
router.put('/items/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const updated = await FoodItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ msg: 'not found' });
    res.status(200).json({ msg: 'updated', data: updated });
  } catch (err) {
    res.status(500).json({ msg: err?.message || err });
  }
});

// patch availability
router.patch('/items/:id/availability', verifyToken, isAdmin, async (req, res) => {
  try {
    const { available } = req.body;
    const updated = await FoodItem.findByIdAndUpdate(req.params.id, { $set: { available } }, { new: true });
    if (!updated) return res.status(404).json({ msg: 'not found' });
    res.status(200).json({ msg: 'updated', data: updated });
  } catch (err) {
    res.status(500).json({ msg: err?.message || err });
  }
});

export default router;