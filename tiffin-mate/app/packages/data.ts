export const packages = ["Veg", "Non-Veg", "Mixed", "Premium"];
export const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Fixed veg package presets (Sun to Fri)
export const vegFixedPackages = [
  {
    id: 'veg-set-a',
    name: 'Veg Package A',
    dayOrder: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"],
    days: {
      Sun: [{ id: 'va1', name: 'Paneer Lababdar' }, { id: 'va2', name: 'Jeera Rice' }],
      Mon: [{ id: 'va3', name: 'Chole Masala' }, { id: 'va4', name: 'Phulka' }],
      Tue: [{ id: 'va5', name: 'Mix Veg Curry' }, { id: 'va6', name: 'Tawa Paratha' }],
      Wed: [{ id: 'va7', name: 'Dal Tadka' }, { id: 'va8', name: 'Cumin Rice' }],
      Thu: [{ id: 'va9', name: 'Kadai Paneer' }, { id: 'va10', name: 'Roti' }],
      Fri: [{ id: 'va11', name: 'Veg Pulao' }, { id: 'va12', name: 'Raita' }],
    },
  },
  {
    id: 'veg-set-b',
    name: 'Veg Package B',
    dayOrder: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"],
    days: {
      Sun: [{ id: 'vb1', name: 'Palak Paneer' }, { id: 'vb2', name: 'Garlic Naan' }],
      Mon: [{ id: 'vb3', name: 'Rajma Masala' }, { id: 'vb4', name: 'Steam Rice' }],
      Tue: [{ id: 'vb5', name: 'Aloo Gobi' }, { id: 'vb6', name: 'Tandoori Roti' }],
      Wed: [{ id: 'vb7', name: 'Methi Malai Mutter' }, { id: 'vb8', name: 'Lachha Paratha' }],
      Thu: [{ id: 'vb9', name: 'Veg Biryani' }, { id: 'vb10', name: 'Onion Raita' }],
      Fri: [{ id: 'vb11', name: 'Paneer Bhurji' }, { id: 'vb12', name: 'Butter Naan' }],
    },
  },
];

export const nonVegFixedPackages = [
  {
    id: 'nveg-set-a',
    name: 'Non-Veg Package A',
    dayOrder: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"],
    days: {
      Sun: [{ id: 'nv1', name: 'Chicken Curry' }, { id: 'nv2', name: 'Jeera Rice' }],
      Mon: [{ id: 'nv3', name: 'Egg Bhurji' }, { id: 'nv4', name: 'Paratha' }],
      Tue: [{ id: 'nv5', name: 'Mutton Curry' }, { id: 'nv6', name: 'Steamed Rice' }],
      Wed: [{ id: 'nv7', name: 'Fish Fry' }, { id: 'nv8', name: 'Salad' }],
      Thu: [{ id: 'nv9', name: 'Chicken Biryani' }, { id: 'nv10', name: 'Raita' }],
      Fri: [{ id: 'nv11', name: 'Grilled Chicken' }, { id: 'nv12', name: 'Garlic Bread' }],
    },
  },
  {
    id: 'nveg-set-b',
    name: 'Non-Veg Package B',
    dayOrder: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"],
    days: {
      Sun: [{ id: 'nvb1', name: 'Butter Chicken' }, { id: 'nvb2', name: 'Naan' }],
      Mon: [{ id: 'nvb3', name: 'Prawn Masala' }, { id: 'nvb4', name: 'Jeera Rice' }],
      Tue: [{ id: 'nvb5', name: 'Egg Curry' }, { id: 'nvb6', name: 'Tandoori Roti' }],
      Wed: [{ id: 'nvb7', name: 'Pepper Chicken' }, { id: 'nvb8', name: 'Onion Rings' }],
      Thu: [{ id: 'nvb9', name: 'Fish Curry' }, { id: 'nvb10', name: 'Steamed Rice' }],
      Fri: [{ id: 'nvb11', name: 'Chicken Kebab' }, { id: 'nvb12', name: 'Mint Chutney' }],
    },
  },
];

export const mixedFixedPackages = [
  {
    id: 'mix-set-a',
    name: 'Mixed Package A',
    dayOrder: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"],
    days: {
      Sun: [{ id: 'mx1', name: 'Paneer + Egg' }, { id: 'mx2', name: 'Paratha' }],
      Mon: [{ id: 'mx3', name: 'Chicken + Veg' }, { id: 'mx4', name: 'Steamed Rice' }],
      Tue: [{ id: 'mx5', name: 'Dal + Fish' }, { id: 'mx6', name: 'Roti' }],
      Wed: [{ id: 'mx7', name: 'Grill + Veg' }, { id: 'mx8', name: 'Salad' }],
      Thu: [{ id: 'mx9', name: 'Biryani (Mixed)' }, { id: 'mx10', name: 'Raita' }],
      Fri: [{ id: 'mx11', name: 'Paneer + Chicken' }, { id: 'mx12', name: 'Naan' }],
    },
  },
  {
    id: 'mix-set-b',
    name: 'Mixed Package B',
    dayOrder: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"],
    days: {
      Sun: [{ id: 'mxb1', name: 'Veg + Fish' }, { id: 'mxb2', name: 'Rice' }],
      Mon: [{ id: 'mxb3', name: 'Egg + Veg' }, { id: 'mxb4', name: 'Paratha' }],
      Tue: [{ id: 'mxb5', name: 'Chicken + Paneer' }, { id: 'mxb6', name: 'Roti' }],
      Wed: [{ id: 'mxb7', name: 'Mutton + Veg' }, { id: 'mxb8', name: 'Steamed Rice' }],
      Thu: [{ id: 'mxb9', name: 'Fish + Veg' }, { id: 'mxb10', name: 'Tandoori Roti' }],
      Fri: [{ id: 'mxb11', name: 'Grill + Veg' }, { id: 'mxb12', name: 'Lemon Rice' }],
    },
  },
];

export const premiumFixedPackages = [
  {
    id: 'pre-set-a',
    name: 'Premium Package A',
    dayOrder: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"],
    days: {
      Sun: [{ id: 'pr1', name: 'Lobster Thermidor' }, { id: 'pr2', name: 'Garlic Bread' }],
      Mon: [{ id: 'pr3', name: 'Lamb Shank' }, { id: 'pr4', name: 'Saffron Rice' }],
      Tue: [{ id: 'pr5', name: 'Duck Confit' }, { id: 'pr6', name: 'Mashed Potato' }],
      Wed: [{ id: 'pr7', name: 'Seafood Platter' }, { id: 'pr8', name: 'Herb Salad' }],
      Thu: [{ id: 'pr9', name: 'Steak Au Poivre' }, { id: 'pr10', name: 'Buttered Veg' }],
      Fri: [{ id: 'pr11', name: 'Chef Tasting Plate' }, { id: 'pr12', name: 'Gourmet Bread' }],
    },
  },
  {
    id: 'pre-set-b',
    name: 'Premium Package B',
    dayOrder: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"],
    days: {
      Sun: [{ id: 'prb1', name: 'Crab Cakes' }, { id: 'prb2', name: 'Aioli' }],
      Mon: [{ id: 'prb3', name: 'Filet Mignon' }, { id: 'prb4', name: 'Truffle Mash' }],
      Tue: [{ id: 'prb5', name: 'Scallops' }, { id: 'prb6', name: 'Risotto' }],
      Wed: [{ id: 'prb7', name: 'Roast Duck' }, { id: 'prb8', name: 'Orange Glaze' }],
      Thu: [{ id: 'prb9', name: 'Lamb Chops' }, { id: 'prb10', name: 'Mint Peas' }],
      Fri: [{ id: 'prb11', name: 'Chef Special Platter' }, { id: 'prb12', name: 'Artisan Bread' }],
    },
  },
];

export const packageMenu = {
  Veg: {
    Mon: [{ id: 'v1', name: 'Paneer Curry' }, { id: 'v2', name: 'Mixed Veg' }],
    Tue: [{ id: 'v3', name: 'Chole Masala' }, { id: 'v4', name: 'Aloo Gobi' }],
    Wed: [{ id: 'v5', name: 'Dal Tadka' }, { id: 'v6', name: 'Jeera Rice' }],
    Thu: [{ id: 'v7', name: 'Palak Paneer' }, { id: 'v8', name: 'Roti' }],
    Fri: [{ id: 'v9', name: 'Veg Biryani' }, { id: 'v10', name: 'Raita' }],
    Sat: [{ id: 'v11', name: 'Methi Malai' }, { id: 'v12', name: 'Paratha' }],
    Sun: [{ id: 'v13', name: 'Navratan Korma' }, { id: 'v14', name: 'Naan' }],
  },
  "Non-Veg": {
    Mon: [{ id: 'n1', name: 'Chicken Curry' }, { id: 'n2', name: 'Egg Fry' }],
    Tue: [{ id: 'n3', name: 'Mutton Curry' }, { id: 'n4', name: 'Fried Fish' }],
    Wed: [{ id: 'n5', name: 'Kadai Chicken' }, { id: 'n6', name: 'Egg Bhurji' }],
    Thu: [{ id: 'n7', name: 'Fish Curry' }, { id: 'n8', name: 'Tandoori Chicken' }],
    Fri: [{ id: 'n9', name: 'Prawn Masala' }, { id: 'n10', name: 'Rice' }],
    Sat: [{ id: 'n11', name: 'Chicken Biryani' }, { id: 'n12', name: 'Salad' }],
    Sun: [{ id: 'n13', name: 'Mixed Grill' }, { id: 'n14', name: 'Naan' }],
  },
  Mixed: {
    Mon: [{ id: 'm1', name: 'Veg + Egg' }, { id: 'm2', name: 'Salad' }],
    Tue: [{ id: 'm3', name: 'Chicken + Veg' }, { id: 'm4', name: 'Roti' }],
    Wed: [{ id: 'm5', name: 'Dal + Fish' }, { id: 'm6', name: 'Rice' }],
    Thu: [{ id: 'm7', name: 'Paneer + Chicken' }, { id: 'm8', name: 'Naan' }],
    Fri: [{ id: 'm9', name: 'Biryani (Mixed)' }, { id: 'm10', name: 'Raita' }],
    Sat: [{ id: 'm11', name: 'Grill + Veg' }, { id: 'm12', name: 'Paratha' }],
    Sun: [{ id: 'm13', name: 'Special Mixed' }, { id: 'm14', name: 'Dessert' }],
  },
  Premium: {
    Mon: [{ id: 'p1', name: 'Chef Special Chicken' }, { id: 'p2', name: 'Gourmet Salad' }],
    Tue: [{ id: 'p3', name: 'Lamb Shank' }, { id: 'p4', name: 'Exotic Rice' }],
    Wed: [{ id: 'p5', name: 'Seafood Platter' }, { id: 'p6', name: 'Steamed Veg' }],
    Thu: [{ id: 'p7', name: 'Duck Confit' }, { id: 'p8', name: 'Gourmet Bread' }],
    Fri: [{ id: 'p9', name: 'Lobster' }, { id: 'p10', name: 'Saffron Rice' }],
    Sat: [{ id: 'p11', name: 'Chef Thali' }, { id: 'p12', name: 'Premium Dessert' }],
    Sun: [{ id: 'p13', name: 'Sunday Roast' }, { id: 'p14', name: 'Sides' }],
  },
};
