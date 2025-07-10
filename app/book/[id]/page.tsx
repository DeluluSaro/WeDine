"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { BookIcon, HomeIcon, InfoIcon, MailIcon } from "lucide-react";

interface Food {
  foodName: string;
  shopName: string;
  location?: string;
  imageUrl?: string;
  image?: { asset: { url: string } };
  price?: number;
  quantity?: number;
  category?: string;
}

const FoodDetailPage = () => {
  const { id } = useParams();
  const [food, setFood] = useState<Food | null>(null);

  useEffect(() => {
    if (!id) return;
    const query = `*[_type == "foodItem" && _id == $id][0]{
      foodName,
      shopName,
      location,
      imageUrl,
      image{asset->{url}},
      price,
      quantity,
      category,
      // add more fields as needed
    }`;
    client.fetch(query, { id }).then(setFood);
  }, [id]);

  if (!food) return <div className="p-8">Loading...</div>;

  const navItems = [
    { name: "Home", link: "/", icon: <HomeIcon /> },
    { name: "Book", link: "/book", icon: <BookIcon /> },
    { name: "About", link: "/about", icon: <InfoIcon /> },
    { name: "Contact", link: "/contact", icon: <MailIcon /> },
  ];
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-blue-200">
        <FloatingNav navItems={navItems} />
      <img
        src={food.image?.asset?.url || food.imageUrl || "/placeholder.jpg"}
        alt={food.foodName}
        className="w-full max-w-lg h-96 object-cover rounded-2xl shadow-xl mb-8"
      />
      <h1 className="text-3xl font-bold text-gray-800 mb-2">{food.foodName}</h1>
      <div className="text-lg text-gray-600 mb-1">{food.shopName}</div>
      {food.location && <div className="text-gray-500 mb-4">{food.location}</div>}
      <div className="text-md text-gray-700 mb-2">Price: ₹{food.price}</div>
      <div className="text-md text-gray-700 mb-2">Available: {food.quantity}</div>
      <div className="text-md text-gray-500">Category: {food.category}</div>
    </div>
  );
};

export default FoodDetailPage;
