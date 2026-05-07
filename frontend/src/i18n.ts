import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "Citizen Dashboard": "Citizen Dashboard",
      "Logout": "Logout",
      "Submit New Complaint": "Submit New Complaint",
      "Description": "Description",
      "Location": "Location",
      "Latitude (opt)": "Latitude (opt)",
      "Longitude (opt)": "Longitude (opt)",
      "Image URL (optional)": "Image URL (optional)",
      "BBMP Zone": "BBMP Zone",
      "Ward No.": "Ward No.",
      "Submit Complaint": "Submit Complaint",
      "Identity attached for Sanchar Saathi Protocol": "Identity attached for Sanchar Saathi Protocol",
      "Trusted Directory & Security Information": "Trusted Directory & Security Information",
      "Asset Verification": "Asset Verification",
      "Kill-Switch Protection": "Kill-Switch Protection",
      "Report Scams": "Report Scams",
      "My Complaints List": "My Complaints List",
      "ID": "ID",
      "Category": "Category",
      "Status": "Status",
      "Security": "Security",
      "Date": "Date",
      "Actions": "Actions",
      "View History": "View History",
      "Describe the issue...": "Describe the issue...",
      "e.g. MG Road, Indiranagar": "e.g. MG Road, Indiranagar",
      "e.g. East": "e.g. East",
      "e.g. 150": "e.g. 150"
    }
  },
  kn: {
    translation: {
      "Citizen Dashboard": "ನಾಗರಿಕ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
      "Logout": "ಲಾಗ್ ಔಟ್",
      "Submit New Complaint": "ಹೊಸ ದೂರು ಸಲ್ಲಿಸಿ",
      "Description": "ವಿವರಣೆ",
      "Location": "ಸ್ಥಳ",
      "Latitude (opt)": "ಅಕ್ಷಾಂಶ (ಐಚ್ಛಿಕ)",
      "Longitude (opt)": "ರೇಖಾಂಶ (ಐಚ್ಛಿಕ)",
      "Image URL (optional)": "ಚಿತ್ರದ URL (ಐಚ್ಛಿಕ)",
      "BBMP Zone": "ಬಿಬಿಎಂಪಿ ವಲಯ",
      "Ward No.": "ವಾರ್ಡ್ ಸಂಖ್ಯೆ",
      "Submit Complaint": "ದೂರು ಸಲ್ಲಿಸಿ",
      "Identity attached for Sanchar Saathi Protocol": "ಸಂಚಾರ್ ಸಾಥಿ ಪ್ರೋಟೋಕಾಲ್‌ಗಾಗಿ ಗುರುತನ್ನು ಲಗತ್ತಿಸಲಾಗಿದೆ",
      "Trusted Directory & Security Information": "ವಿಶ್ವಾಸಾರ್ಹ ಡೈರೆಕ್ಟರಿ ಮತ್ತು ಭದ್ರತೆ ಮಾಹಿತಿ",
      "Asset Verification": "ಸ್ವತ್ತು ಪರಿಶೀಲನೆ",
      "Kill-Switch Protection": "ಕಿಲ್-ಸ್ವಿಚ್ ರಕ್ಷಣೆ",
      "Report Scams": "ವಂಚನೆಗಳನ್ನು ವರದಿ ಮಾಡಿ",
      "My Complaints List": "ನನ್ನ ದೂರುಗಳ ಪಟ್ಟಿ",
      "ID": "ಐಡಿ",
      "Category": "ವರ್ಗ",
      "Status": "ಸ್ಥಿತಿ",
      "Security": "ಭದ್ರತೆ",
      "Date": "ದಿನಾಂಕ",
      "Actions": "ಕ್ರಮಗಳು",
      "View History": "ಇತಿಹಾಸವನ್ನು ವೀಕ್ಷಿಸಿ",
      "Describe the issue...": "ಸಮಸ್ಯೆಯನ್ನು ವಿವರಿಸಿ...",
      "e.g. MG Road, Indiranagar": "ಉದಾ. ಎಂಜಿ ರಸ್ತೆ, ಇಂದಿರಾನಗರ",
      "e.g. East": "ಉದಾ. ಪೂರ್ವ",
      "e.g. 150": "ಉದಾ. 150"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
