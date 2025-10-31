import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import { SparklesIcon, ListIcon, PantryIcon, ProgressIcon, UploadIcon } from './Icons';

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; }> = ({ icon, title, children }) => (
    <div className="bg-white dark:bg-gray-800/50 p-6 rounded-2xl shadow-lg border border-transparent hover:border-violet-300 dark:hover:border-violet-700 transition-all duration-300 transform hover:-translate-y-1">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-violet-100 dark:bg-gray-700 text-violet-600 dark:text-violet-400 mb-4">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">{children}</p>
    </div>
);

const BenefitItem: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div>
        <h4 className="font-bold text-xl text-gray-800 dark:text-gray-200 mb-2">{title}</h4>
        <p className="text-gray-600 dark:text-gray-400">{children}</p>
    </div>
);

const HomePage: React.FC = observer(() => {
    return (
        <div className="max-w-6xl mx-auto py-8 text-center">
            {/* Hero Section */}
            <section className="py-16">
                <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600 mb-4 break-words">
                    {t('homeTitle')}
                </h1>
                <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8 break-words">
                    {t('homeSubtitle')}
                </p>
                <button
                    onClick={() => mealPlanStore.startSimulation()}
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-violet-600 text-white font-semibold text-lg hover:bg-violet-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                    <SparklesIcon />
                    <span>{t('simulateApp')}</span>
                </button>
            </section>
            
            {/* Features Section */}
            <section className="py-16 bg-slate-100 dark:bg-gray-800/30 rounded-3xl">
                <div className="max-w-5xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-12">{t('homeFeaturesTitle')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
                        <FeatureCard icon={<UploadIcon />} title={t('homeFeature1Title')}>{t('homeFeature1Desc')}</FeatureCard>
                        <FeatureCard icon={<ListIcon />} title={t('homeFeature2Title')}>{t('homeFeature2Desc')}</FeatureCard>
                        <FeatureCard icon={<PantryIcon />} title={t('homeFeature3Title')}>{t('homeFeature3Desc')}</FeatureCard>
                        <FeatureCard icon={<ProgressIcon />} title={t('homeFeature4Title')}>{t('homeFeature4Desc')}</FeatureCard>
                    </div>
                </div>
            </section>
            
            {/* Benefits Section */}
            <section className="py-20">
                <div className="max-w-4xl mx-auto px-4 text-left">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-10 text-center">{t('homeBenefitsTitle')}</h2>
                    <div className="space-y-10">
                        <BenefitItem title={`✅ ${t('homeBenefit1')}`}>{t('homeBenefit1Desc')}</BenefitItem>
                        <BenefitItem title={`🛒 ${t('homeBenefit2')}`}>{t('homeBenefit2Desc')}</BenefitItem>
                        <BenefitItem title={`🚀 ${t('homeBenefit3')}`}>{t('homeBenefit3Desc')}</BenefitItem>
                    </div>
                </div>
            </section>
            
            {/* Final CTA */}
            <section className="py-16">
                 <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">{t('homeFinalCta')}</h2>
                 <button
                    onClick={() => mealPlanStore.startSimulation()}
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-violet-600 text-white font-semibold text-lg hover:bg-violet-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                    <SparklesIcon />
                    <span>{t('simulateApp')}</span>
                </button>
            </section>
        </div>
    );
});

export default HomePage;