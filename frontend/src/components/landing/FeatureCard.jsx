import { ScreenshotFrame } from '@/components/landing/ScreenshotFrame';

/**
 * Grand panneau teinté : texte en bas à gauche, capture produit inclinée qui
 * déborde du cadre à droite.
 */
export function FeatureCard({ feature, index }) {
  const shiftsRight = index % 2 === 0;

  return (
    <article
      className={`relative overflow-hidden rounded-[2rem] ${feature.tint}`}
    >
      <div className="grid items-end gap-8 lg:grid-cols-2">
        <div
          className={`px-7 pb-10 pt-12 sm:px-10 lg:pb-14 lg:pt-20 ${
            shiftsRight ? 'lg:order-1' : 'lg:order-2'
          }`}
        >
          <h3 className="font-display text-3xl font-normal leading-[1.1] tracking-tight text-white sm:text-4xl">
            {feature.title}
          </h3>
          <p className="mt-5 max-w-md font-grotesk text-[15px] leading-relaxed text-white/70">
            {feature.text}
          </p>
        </div>

        <div
          className={`relative min-h-[16rem] px-7 sm:px-10 lg:min-h-[26rem] lg:px-0 ${
            shiftsRight ? 'lg:order-2' : 'lg:order-1'
          }`}
        >
          <div
            className={`pb-10 lg:absolute lg:bottom-0 lg:top-12 lg:w-[130%] lg:pb-0 ${
              shiftsRight ? 'lg:left-8' : 'lg:right-8'
            }`}
          >
            <ScreenshotFrame
              src={feature.shot}
              alt={feature.alt}
              tilt={shiftsRight ? 'left' : 'right'}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
