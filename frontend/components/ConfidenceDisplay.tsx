import React from 'react'
import { Badge } from './ui/badge'
import { useTranslation } from 'react-i18next'

interface ConfidenceDisplayProps {
    confidence: number
    className?: string
}

export const ConfidenceDisplay: React.FC<ConfidenceDisplayProps> = ({ confidence, className }) => {
    const { t } = useTranslation('common')

    // Normalize confidence to 0-100 just in case, though API usually handles it
    const value = confidence <= 1 ? confidence * 100 : confidence

    // Determine color and label based on confidence level
    let colorClass = 'bg-red-500 text-red-700'
    let label = t('confidence_levels.low')
    let progressBarColor = 'bg-red-500'

    if (value >= 80) {
        colorClass = 'bg-green-100 text-green-800 border-green-200'
        label = t('confidence_levels.high')
        progressBarColor = 'bg-green-500'
    } else if (value >= 50) {
        colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200'
        label = t('confidence_levels.moderate')
        progressBarColor = 'bg-yellow-500'
    } else {
        colorClass = 'bg-red-100 text-red-800 border-red-200'
        label = t('confidence_levels.low')
        progressBarColor = 'bg-red-500'
    }

    return (
        <div className={`w-full ${className}`}>
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">{t('history.details.confidence')}</span>
                <Badge variant="outline" className={`${colorClass} font-medium`}>
                    {value.toFixed(1)}% ({label})
                </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                    className={`h-2.5 rounded-full ${progressBarColor} transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                ></div>
            </div>
        </div>
    )
}
