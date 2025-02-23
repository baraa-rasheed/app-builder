import {Platform} from 'react-native';
import {isRTL} from './helpers';

export const API_REF_ID =
  'iHe8XNne4FPCZtXKqKFEd6LtslBVT73XtUjOydIKssRNQ9dmFNksccO6qdiYwjwFhfG9x0wsCIP8kep2A00ZlcQXsP';

//export const DOMAIN_URL = 'http://127.0.0.1:8000';
export const DOMAIN_URL = 'https://bitesnbags.com';
// export const DOMAIN_URL = 'https://stg.bitesnbags.com';

export const API_BASE_URL = `${DOMAIN_URL}/api/v4`;

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

export const MEPS_CONFIG = {
  MERCHANT_ID: '9800064300',
  API_USER_NAME: 'merchant.9800064300',
  API_PASSWORD: '7cdc14a0d6e16a5a63f39e9062acbec3',
};

export const PUSHER_INSTANCE_ID = 'd5fe0bbf-c8c8-4134-b39f-1034e1319dcc';

export enum StorageKeys {
  API_TOKEN = 'API_TOKEN',
  FCM_TOKEN = 'FCM_TOKEN',
  USER = 'USER',
  CART_ITEMS = 'CART_ITEMS',
  IS_LANGUAGE_SET = 'IS_LANGUAGE_SET',
  TIP_AMOUNT = 'TIP_AMOUNT',
}

export enum ORDER_METHODS {
  DELIVERY = 'delivery',
  PICK_UP = 'pickup',
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
