import type { Metadata } from 'next';
import GamePageContent from '@/components/game/GamePageContent';

export const metadata: Metadata = {
  title: 'Game – NinjaEng',
  description: 'Practica tu inglés jugando.',
};

export default function GamePage() {
  return <GamePageContent />;
}
