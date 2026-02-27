import React, {createContext, useContext, useState, ReactNode, useRef, useEffect} from 'react';
import {CustomAlert} from '../components/common/CustomAlert';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  buttons?: AlertButton[];
  autoDismiss?: boolean; // ✅ Auto-dismiss flag
  duration?: number; // ✅ Duration in milliseconds (default 3000)
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [visible, setVisible] = useState(false);
  const [alertOptions, setAlertOptions] = useState<AlertOptions | null>(null);
  // ✅ Fixed: Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
      }
    };
  }, []);

  const showAlert = (options: AlertOptions) => {
    // Clear any existing timer
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    }

    setAlertOptions(options);
    setVisible(true);

    // ✅ Set auto-dismiss timer if enabled
    if (options.autoDismiss) {
      const duration = options.duration || 3000;
      autoDismissTimer.current = setTimeout(() => {
        hideAlert();
      }, duration);
    }
  };

  const hideAlert = () => {
    // Clear timer when manually dismissing
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    }
    
    setVisible(false);
    
    // ✅ Clear alert options after animation completes
    setTimeout(() => {
      setAlertOptions(null);
    }, 300);
  };

  return (
    <AlertContext.Provider value={{showAlert, hideAlert}}>
      {children}
      {alertOptions && (
        <CustomAlert
          visible={visible}
          title={alertOptions.title}
          message={alertOptions.message}
          type={alertOptions.type}
          buttons={alertOptions.buttons}
          onDismiss={hideAlert}
          autoDismiss={alertOptions.autoDismiss} // ✅ Pass to CustomAlert
          duration={alertOptions.duration} // ✅ Pass to CustomAlert
        />
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};