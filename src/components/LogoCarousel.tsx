import { useEffect, useRef } from 'react';

interface Logo {
  name: string;
  url?: string;
}

interface LogoCarouselProps {
  logos: Logo[];
  badge?: string;
}

export function LogoCarousel({ logos, badge }: LogoCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let scrollPosition = 0;
    const scrollSpeed = 0.5;

    const animate = () => {
      scrollPosition += scrollSpeed;

      if (scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0;
      }

      scrollContainer.scrollLeft = scrollPosition;
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [logos]);

  const allLogos = [...logos, ...logos, ...logos];

  return (
    <section className="py-12 bg-slate-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {badge && (
          <div className="text-center mb-8">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
              {badge}
            </p>
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex items-center gap-16 overflow-hidden"
          style={{
            scrollBehavior: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {allLogos.map((logo, index) => (
            <div
              key={`${logo.name}-${index}`}
              className="flex-shrink-0 opacity-40 grayscale hover:opacity-70 hover:grayscale-0 transition-all duration-300"
            >
              {logo.url ? (
                <img
                  src={logo.url}
                  alt={logo.name}
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <div className="text-2xl font-black text-slate-600 whitespace-nowrap px-4">
                  {logo.name}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
