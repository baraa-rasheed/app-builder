import {Platform} from 'react-native';
import {isRTL} from './helpers';

export const API_REF_ID =
  'rhIWeN14ExFlUpPyPUnh1jAkYC8uuXIBPCRZo08j5ypJyamqt42XLTDCcPGE47KOXOPMbbnnZJop6ZFSnd5vnSPZT5';

// bundle ID: com.bitesnbags.ivyshop
//export const DOMAIN_URL = 'http://127.0.0.1:8000';
//export const DOMAIN_URL = 'https://bitesnbags.com';
export const DOMAIN_URL = 'https://bitesnbags.com';

export const API_BASE_URL = `${DOMAIN_URL}/api/v3`;

// Credit Card Payments
////////////////
//// PAYMENT CONFIG
////////////////
export const API_ADD_CREDIT_CARD_URL = `${DOMAIN_URL}/add-new-credit-card/`;
export const API_ADD_CREDIT_SUCCESS_URL = `${DOMAIN_URL}/successpage`;
export const API_CARD_SECURE_ERROR_URL = `${DOMAIN_URL}/errorPayment`;
export const API_CARD_SECURE_SUCCESS_URL = `${DOMAIN_URL}/successPayment`;

export const DEFAULT_HEADERS = {
  Accept: 'application/json',
};

export const GOOGLE_API_KEY = Platform.select({
  ios: 'AIzaSyC19YflYeNaeb6cQDaBgTXhPAI19tXDd-8',
  android: 'AIzaSyD78x9mV7fUctkp1tUDVnO7v5dMZyVwyXc',
});

export const PUSHER_INSTANCE_ID = 'da6ea109-6e22-4198-a1d2-bbd03dd523a6';

export enum StorageKeys {
  API_TOKEN = 'API_TOKEN',
  FCM_TOKEN = 'FCM_TOKEN',
  USER = 'USER',
  CART_ITEMS = 'CART_ITEMS',
  IS_LANGUAGE_SET = 'IS_LANGUAGE_SET',
}

export enum ORDER_METHODS {
  DELIVERY = 'DELIVERY',
  PICK_UP = 'PICK_UP',
}

export enum Screens {
  HOME = 'HOME',
  AUTH = 'AUTH',
  SEARCH = 'SEARCH',
  DRAWER = 'DRAWER',
  ACCOUNT = 'ACCOUNT',
  MAIN_NAV = 'MAIN_NAV',
  USER_INFO = 'USER_INFO',
  AUTH_INTRO = 'AUTH_INTRO',
  ONBOARDING = 'ONBOARDING',
  REGISTRATION = 'REGISTRATION',
  ORDER_DETAILS = 'ORDER_DETAILS',
  ITEM_DETAILS = 'ITEM_DETAILS',
  MOBILE_NUMBER = 'MOBILE_NUMBER',
  MOBILE_VERIFY = 'MOBILE_VERIFY',
  ABOUT = 'ABOUT',
  CART = 'CART',
  SETTINGS = 'SETTINGS',
  REWARDS = 'REWARDS',
  ACCOUNT_INFO = 'ACCOUNT_INFO',
  ADDRESS = 'ADDRESS',
  ADDRESSES = 'ADDRESSES',
  ON_BORDING_ADDRESSES = 'ON_BORDING_ADDRESSES',
  ORDER_HISTORY = 'ORDER_HISTORY',
  ITEM_SELECTOR = 'ITEM_SELECTOR',
  NO_CONNECTION = 'NO_CONNECTION',
  TRACK_ORDER = 'TRACK_ORDER',
  ADD_PROMOCODE = 'ADD_PROMOCODE',
}

export const FONTS = {
  REGULAR: isRTL('Cairo-Regular', 'Poppins-Regular'),
  BOLD: isRTL('Cairo-Bold', 'Poppins-Bold'),
  SEMI_BOLD: isRTL('Cairo-Bold', 'Poppins-SemiBold'),
  MEDIUM: isRTL('Cairo-Bold', 'Poppins-Medium'),
  LIGHT: isRTL('Cairo-Light', 'Poppins-Light'),
};

export const COLORS = {
  PRIMARY: '#FF714C',
  BACKGROUND: 'rgb(240,243,249)',
  GREY: '#8999A7',
};
