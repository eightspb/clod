import { Phone, MessageCircle } from 'lucide-react'
import { ErrorBoundary } from '../ErrorBoundary.jsx'
import { FadeInSection } from '../FadeInSection.jsx'
import { PHONE_NUMBER, TELEGRAM_URL } from '../../lib/contacts.js'
import { DOCTORS } from '../../lib/doctors-data.js'
import { HeroSlider } from '../home/HeroSlider.jsx'
import { MobileDoctorCarousel } from '../MobileDoctorCarousel.jsx'
import { SecondOpinionSection } from '../home/SecondOpinionSection.jsx'
import { VabSection } from '../home/VabSection.jsx'
import { ServicesSection } from '../home/ServicesSection.jsx'
import { WhyUsSection } from '../home/WhyUsSection.jsx'
import { DoctorsSection } from '../home/DoctorsSection.jsx'
import { DirectContactSection } from '../home/DirectContactSection.jsx'
import { ReviewsSection } from '../home/ReviewsSection.jsx'
import { AppointmentFormSection } from '../home/AppointmentFormSection.jsx'

export function Home({ doctorsData = DOCTORS }) {
  return (
    <ErrorBoundary>
    <div>
      <section className="relative overflow-hidden md:hidden">
        <div className="absolute inset-0 hero-gradient pointer-events-none" />
        <div className="container-clay relative z-10 py-4">
          <MobileDoctorCarousel doctors={doctorsData} label="Карусель врачей в начале страницы" />
        </div>
      </section>
      <div className="hidden md:block">
        <HeroSlider />
      </div>

      <FadeInSection>
        <ServicesSection />
      </FadeInSection>

      <FadeInSection>
        <WhyUsSection />
      </FadeInSection>

      <FadeInSection className="hidden md:block">
        <DoctorsSection doctorsData={doctorsData} />
      </FadeInSection>

      <FadeInSection>
        <VabSection />
      </FadeInSection>

      <FadeInSection>
        <SecondOpinionSection />
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
          <div className="clay clay-card p-6 md:p-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl sm:text-4xl heading-serif text-clay-dark mb-3">
                Нужна помощь с маршрутом?
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
