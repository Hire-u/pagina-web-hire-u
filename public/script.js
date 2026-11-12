import { JobController } from './js/controllers/JobController.js';
import { AuthModel } from './js/models/AuthModel.js';
import { JobModel } from './js/models/JobModel.js';
import { JobView } from './js/views/JobView.js';

const controller = new JobController(new JobModel(), new JobView(), new AuthModel());
controller.start();
