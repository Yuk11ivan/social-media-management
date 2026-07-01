import ImageCarouselBackground from '../home/ImageCarouselBackground';

export default function DashboardBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
      <ImageCarouselBackground showDots={false} autoPlay={false} />
    </div>
  );
}
