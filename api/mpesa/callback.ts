import app from "../../server/index";
import { vercelPathApp } from "../../server/vercelAdapter";

export default vercelPathApp(app, "/api/mpesa/callback");