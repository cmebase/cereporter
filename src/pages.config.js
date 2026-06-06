/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminSettings from './pages/AdminSettings';
import CertificateSetup from './pages/CertificateSetup';
import ClassManagement from './pages/ClassManagement';
import CreditManagement from './pages/CreditManagement';
import Dashboard from './pages/Dashboard';
import InstructorManagement from './pages/InstructorManagement';
import JointSponsorManagement from './pages/JointSponsorManagement';
import ManageCoordinators from './pages/ManageCoordinators';
import MethodManagement from './pages/MethodManagement';
import MyAccess from './pages/MyAccess';
import MyHospitals from './pages/MyHospitals';
import NameManagement from './pages/NameManagement';
import ParticipantManagement from './pages/ParticipantManagement';
import Properties from './pages/Properties';
import Records from './pages/Records';
import ResetPassword from './pages/ResetPassword';
import SpareFieldManagement from './pages/SpareFieldManagement';
import SpecialtyManagement from './pages/SpecialtyManagement';
import StatusManagement from './pages/StatusManagement';
import SupportTickets from './pages/SupportTickets';
import TitleManagement from './pages/TitleManagement';
import UserManagement from './pages/UserManagement';
import UserProfile from './pages/UserProfile';
import Utilities from './pages/Utilities';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminSettings": AdminSettings,
    "CertificateSetup": CertificateSetup,
    "ClassManagement": ClassManagement,
    "CreditManagement": CreditManagement,
    "Dashboard": Dashboard,
    "InstructorManagement": InstructorManagement,
    "JointSponsorManagement": JointSponsorManagement,
    "ManageCoordinators": ManageCoordinators,
    "MethodManagement": MethodManagement,
    "MyAccess": MyAccess,
    "MyHospitals": MyHospitals,
    "NameManagement": NameManagement,
    "ParticipantManagement": ParticipantManagement,
    "Properties": Properties,
    "Records": Records,
    "ResetPassword": ResetPassword,
    "SpareFieldManagement": SpareFieldManagement,
    "SpecialtyManagement": SpecialtyManagement,
    "StatusManagement": StatusManagement,
    "SupportTickets": SupportTickets,
    "TitleManagement": TitleManagement,
    "UserManagement": UserManagement,
    "UserProfile": UserProfile,
    "Utilities": Utilities,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};