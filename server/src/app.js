import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import bodyParser from "body-parser"
import morgan from "morgan"
import dotenv from "dotenv"
dotenv.config();

const app=express();


app.use(cors({
    origin:"http://localhost:5173",
    credentials:true
}))

app.use(cookieParser());

app.use(morgan('dev'))

// Only use bodyParser for non-file routes, or after file upload routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

export {app};