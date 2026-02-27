import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  foodItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'fooditems', required: true },
  qty: { type: Number, required: true },
  unitPrice: { type: Number, required: true }
});


const OrderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  items: [OrderItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: { type: String, enum: ['none','pending','confirmed','preparing','out_for_delivery','completed','cancelled'], default: 'none' },
  paymentStatus: { type: String, enum: ['none','pending','paid','failed'], default: 'none' },
  notes: { type: String }
}, { timestamps: true });

const OrderItem = mongoose.models.orderitems || mongoose.model('orderitems', OrderItemSchema);
const Order = mongoose.models.orders || mongoose.model('orders', OrderSchema);

export { Order, OrderItem };