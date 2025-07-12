"use client";
import React, { useEffect, useRef, useState } from 'react';

interface FoodEmoji {
  id: number;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  scale: number;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
}

const foodEmojis = [
  "🍕", "🍔", "🍟", "🌭", "🌮", "🌯", "🥪", "🥙", "🧆", "🥘", "🥗", "🥣", "🥡", "🥢", "🍜", "🍝", "🍛", "🍣", "🍱", "🥟", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "☕", "🫖", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺", "🍷", "🥂", "🥃", "🍸", "🍹", "🍾", "🥄", "🍴", "🍽️", "🥄", "🥢", "🥡", "🧂", "🍯", "🥜", "🌰", "🥑", "🥦", "🥬", "🥒", "🌶️", "🌽", "🥕", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🥪", "🥙", "🧆", "🌮", "🌯", "🥗", "🥘", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥟", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "☕", "🫖", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺", "🍷", "🥂", "🥃", "🍸", "🍹", "🍾"
];

const FloatingFoodBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emojisRef = useRef<FoodEmoji[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedEmoji, setDraggedEmoji] = useState<FoodEmoji | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize emojis
    const initialEmojis: FoodEmoji[] = Array.from({ length: 30 }, (_, i) => ({ // Reduced from 50 to 30 for better performance
      id: i,
      emoji: foodEmojis[Math.floor(Math.random() * foodEmojis.length)],
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 3, // Fixed extreme values, now smooth
      vy: (Math.random() - 0.5) * 3, // Fixed extreme values, now smooth
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 1,
      isDragging: false,
      dragOffset: { x: 0, y: 0 }
    }));

    emojisRef.current = initialEmojis;

    // Animation loop
    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update emojis
      emojisRef.current = emojisRef.current.map(emoji => {
        if (emoji.isDragging) return emoji;

        // Physics update
        let newX = emoji.x + emoji.vx;
        let newY = emoji.y + emoji.vy;
        let newVx = emoji.vx;
        let newVy = emoji.vy;

        // Bounce off walls
        if (newX <= 0 || newX >= canvas.width) {
          newVx = -newVx;
          newX = Math.max(0, Math.min(canvas.width, newX));
        }
        if (newY <= 0 || newY >= canvas.height) {
          newVy = -newVy;
          newY = Math.max(0, Math.min(canvas.height, newY));
        }

        // Gravity effect
        newVy += 0.08; // Reduced for smoother movement

        // Rotation
        const newRotation = emoji.rotation + 0.8; // Reduced for smoother rotation

        return {
          ...emoji,
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy,
          rotation: newRotation
        };
      });

      // Draw emojis
      emojisRef.current.forEach(emoji => {
        ctx.save();
        ctx.translate(emoji.x, emoji.y);
        ctx.rotate((emoji.rotation * Math.PI) / 180);
        ctx.scale(emoji.scale, emoji.scale);
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji.emoji, 0, 0);
        ctx.restore();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on an emoji
    const clickedEmoji = emojisRef.current.find(emoji => {
      const distance = Math.sqrt((x - emoji.x) ** 2 + (y - emoji.y) ** 2);
      return distance < 20 * emoji.scale;
    });

    if (clickedEmoji) {
      setIsDragging(true);
      setDraggedEmoji(clickedEmoji);
      setMousePos({ x, y });
      
      emojisRef.current = emojisRef.current.map(emoji => 
        emoji.id === clickedEmoji.id 
          ? { ...emoji, isDragging: true, dragOffset: { x: x - emoji.x, y: y - emoji.y } }
          : emoji
      );
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDragging || !draggedEmoji) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    emojisRef.current = emojisRef.current.map(emoji => 
      emoji.id === draggedEmoji.id 
        ? { 
            ...emoji, 
            x: x - emoji.dragOffset.x, 
            y: y - emoji.dragOffset.y,
            vx: (x - mousePos.x) * 0.12, // Increased from 0.1 to 0.12 (1.2x)
            vy: (y - mousePos.y) * 0.12  // Increased from 0.1 to 0.12 (1.2x)
          }
        : emoji
    );
  };

  const handleMouseUp = () => {
    if (isDragging && draggedEmoji) {
      setIsDragging(false);
      setDraggedEmoji(null);
      
      emojisRef.current = emojisRef.current.map(emoji => 
        emoji.id === draggedEmoji.id 
          ? { ...emoji, isDragging: false }
          : emoji
      );
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-auto z-5" // Changed from z-30 to z-5 to be below sign-in form
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    />
  );
};

export default FloatingFoodBackground; 