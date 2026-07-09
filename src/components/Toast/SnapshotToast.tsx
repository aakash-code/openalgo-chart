import React from 'react';
import styles from './Toast.module.css';
import { Check } from 'lucide-react';

export interface SnapshotToastProps {
    message: string;
    onClose?: () => void;
}

const SnapshotToast: React.FC<SnapshotToastProps> = ({ message, onClose }) => {
    return (
        <div className={styles.snapshotToast}>
            <div className={styles.snapshotContent}>
                <div className={styles.checkIcon}>
                    <Check size={12} strokeWidth={3} />
                </div>
                <span>{message}</span>
                <span className={styles.snapshotIcon}>👍</span>
            </div>
        </div>
    );
};

export default SnapshotToast;
