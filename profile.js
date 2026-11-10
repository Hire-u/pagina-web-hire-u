import { ProfileController } from './js/controllers/ProfileController.js';
import { AuthModel } from './js/models/AuthModel.js';
import { ProfileView } from './js/views/ProfileView.js';

new ProfileController(new AuthModel(), new ProfileView()).start();