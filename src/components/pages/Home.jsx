import { Phone, MessageCircle } from 'lucide-react'
import { ErrorBoundary } from '../ErrorBoundary.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { PHONE_NUMBER, TELEGRAM_URL } from '../../lib/contacts.js'
import { HeroSlider } from '../home/HeroSlider.jsx'
import { SecondOpinionSection } from '../home/SecondOpinionSection.jsx'
import { VabSection } from '../home/VabSection.jsx'
import { ServicesSection } from '../home/ServicesSection.jsx'
import { WhyUsSection } from '../home/WhyUsSection.jsx'
import { DoctorsSection } from '../home/DoctorsSection.jsx'
import { DirectContactSection } from '../home/DirectContactSection.jsx'
import { ReviewsSection } from '../home/ReviewsSection.jsx'
import { AppointmentFormSection } from '../home/AppointmentFormSection.jsx'

export function Home({ doctorsData = [] }) {
  return (
    <ErrorBoundary>
    <div>
      <HeroSlider />

      <FadeInSection>
        <SecondOpinionSection />
      </FadeInSection>

      <FadeInSection>
        <VabSection />
      </FadeInSection>

      <FadeInSection>
        <ServicesSection />
      </FadeInSection>

      <FadeInSection>
        <WhyUsSection />
      </FadeInSection>

      <FadeInSection>
        <DoctorsSection doctorsData={doctorsData} />
      </FadeInSection>

      <FadeInSection>
        <DirectContactSection />
      </FadeInSection>

      <FadeInSection>
        <ReviewsSection />
      </FadeInSection>

      <FadeInSection>
        <AppointmentFormSection />
      </FadeInSection>

      <FadeInSection>
      <section className="section">
        <div className="container-clay">
          <div className="clay clay-card p-6 md:p-8 text-center relative overflow-hidden">
            <div className="blob-peach absolute -top-10 -right-10 w-40 h-40 opacity-50 pointer-events-none" />
            <div className="blob-mint absolute -bottom-10 -left-10 w-40 h-40 opacity-40 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">
                Не знаете, к кому обратиться?
              </h2>
              <p className="text-clay-muted text-lg mb-5 max-w-xl mx-auto">
                Позвоните нам или напишите в мессенджер - поможем с маршрутом и подскажем, с чего лучше начать.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a href={`tel:${PHONE_NUMBER}`} className="clay btn-clay-secondary gap-2">
                  <Phone size={16} />
                  Позвонить
                </a>
                <a href={TELEGRAM_URL} className="clay btn-clay-secondary gap-2" target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={16} />
                  Telegram
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      </FadeInSection>
    </div>
    </ErrorBoundary>
  )
}
