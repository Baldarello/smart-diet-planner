import React from 'react';
import { observer } from 'mobx-react-lite';
import { syncStore } from '../../stores/SyncStore';
import { t } from '../../i18n';
import { CloudCheckIcon, CloudSyncIcon, CloudAlertIcon, CloudOfflineIcon } from '../Icons';

const SyncStatusIndicator: React.FC = observer(() => {
    const { status, lastSync, error } = syncStore;

    const getStatusContent = () => {
        switch (status) {
            case 'syncing':
                return {
                    icon: <CloudSyncIcon />,
                    text: t('syncStatusSyncing'),
                    color: 'text-blue-500 dark:text-blue-400',
                    title: t('syncStatusSyncing'),
                };
            case 'synced':
                const time = lastSync ? lastSync.toLocaleTimeString() : '';
                return {
                    icon: <CloudCheckIcon />,
                    text: t('syncStatusSynced'),
                    color: 'text-green-500 dark:text-green-400',
                    title: t('syncLastSync', { time }),
                };
            case 'error':
                return {
                    icon: <CloudAlertIcon />,
                    text: t('syncStatusError'),
                    color: 'text-red-500 dark:text-red-40a00',
                    title: error || t('syncStatusError'),
                };
            case 'idle':
            default:
                return {
                    icon: <CloudOfflineIcon />,
                    text: t('syncStatusIdle'),
                    color: 'text-gray-500 dark:text-gray-400',
                    title: t('syncStatusIdle'),
                };
        }
    };

    const { icon, text, color, title } = getStatusContent();

    return (
        <div className={`flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-gray-700/50 ${color}`} title={title}>
            {icon}
            <span className="font-semibold text-sm hidden sm:inline">{text}</span>
        </div>
    );
});

export default SyncStatusIndicator;