import mongoose from 'mongoose';

const FoodItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  available: { type: Boolean, default: true },
  tags: [{ type: String }],
  imageUrl: { type: String }
}, { timestamps: true });

export default mongoose.models.fooditems || mongoose.model('fooditems', FoodItemSchema);
