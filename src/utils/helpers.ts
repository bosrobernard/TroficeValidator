import {Alert} from 'react-native';

export const showError = (message: string, title = 'Error') => {
  Alert.alert(title, message);
};

export const showSuccess = (message: string, title = 'Success') => {
  Alert.alert(title, message);
};

export const showConfirm = (
  message: string,
  onConfirm: () => void,
  title = 'Confirm',
) => {
  Alert.alert(title, message, [
    {text: 'Cancel', style: 'cancel'},
    {text: 'OK', onPress: onConfirm},
  ]);
};

export const formatCurrency = (amount: number, currency = 'GHS'): string => {
  return `${currency} ${amount.toFixed(2)}`;
};

export const truncateString = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
};