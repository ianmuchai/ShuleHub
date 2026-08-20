import app from "../server/index";
import { vercelApiApp } from "../server/vercelAdapter";

export default vercelApiApp(app);