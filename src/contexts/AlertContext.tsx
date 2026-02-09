import React, {createContext, useContext, useState, ReactNode} from 'react';
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
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [visible, setVisible] = useState(false);
  const [alertOptions, setAlertOptions] = useState<AlertOptions | null>(null); // ✅ Changed to null

  const showAlert = (options: AlertOptions) => {
    setAlertOptions(options);
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
  };

  return (
    <AlertContext.Provider value={{showAlert, hideAlert}}>
      {children}
      {alertOptions && ( // ✅ Only render when alertOptions exists
        <CustomAlert
          visible={visible}
          title={alertOptions.title}
          message={alertOptions.message}
          type={alertOptions.type}
          buttons={alertOptions.buttons}
          onDismiss={hideAlert}
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