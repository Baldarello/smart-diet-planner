import React from 'react';
import { CloseIcon } from './Icons';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, children }) => {
    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ease-in-out ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            />

            {/* Drawer */}
            <div
                className={`fixed top-0 left-0 h-full w-80 max-w-[80vw] bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                role="dialog"
                aria-modal="true"
            >
                <div className="flex justify-end p-4">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label="Close menu"
                    >
                        <CloseIcon />
                    </button>
                </div>
                <div className="p-4 pt-0">
                    {children}
                </div>
            </div>
        </>
    );
};

export default Drawer;