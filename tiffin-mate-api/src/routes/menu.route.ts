import { Router, Request, Response } from 'express';

const router = Router();

const sampleMenu = [
  { id: 'm1', title: 'Paneer Butter Masala', description: 'Creamy paneer curry with soft spices', price: 6.5, category: 'Vegetarian', image: '' },
  { id: 'm2', title: 'Chicken Biryani', description: 'Fragrant basmati rice with spiced chicken', price: 8.0, category: 'Non-Veg', image: '' },
  { id: 'm3', title: 'Aloo Paratha', description: 'Stuffed potato flatbread with yogurt', price: 3.5, category: 'Vegetarian', image: '' },
  { id: 'm4', title: 'Masala Dosa', description: 'Crispy dosa with spiced potato filling', price: 4.0, category: 'Vegetarian', image: '' },
  { id: 'm5', title: 'Fish Curry', description: 'Tangy coastal fish curry', price: 9.0, category: 'Non-Veg', image: '' }
];

router.get('/', (req: Request, res: Response) => {
  // simple filters: search and category
  const q = (req.query.q as string) || '';
  const category = (req.query.category as string) || '';
  let items = sampleMenu.slice();
  if (q) {
    const qq = q.toLowerCase();
    items = items.filter((i) => i.title.toLowerCase().includes(qq) || i.description.toLowerCase().includes(qq));
  }
  if (category) {
    items = items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
  }
  res.json({ success: true, data: items });
});

export default router;
