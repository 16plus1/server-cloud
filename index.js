const express = require("express")
const mongoose = require("mongoose") //импорт мангус и тд
const config = require("config")
const fileupload = require("express-fileupload")
const authRouter = require("./routes/auth.routes")
const fileRouter = require("./routes/file.routes")
const app = express() //создание сервера
const PORT = process.env.PORT || config.get('serverPort') //получение значения порта
const corsMiddleware = require('./middleware/cors.middleware')
const filePathMiddleware = require('./middleware/filepath.middleware')
const path = require('path')

app.use(fileupload({}))
app.use(corsMiddleware)
app.use(filePathMiddleware(path.resolve(__dirname, 'files')))
app.use(express.json())
app.use(express.static('static'))
app.use("/api/auth", authRouter) //подключение роутов
app.use("/api/files", fileRouter)


const start = async() => {
    try {
        await mongoose.connect(config.get("dburl"), {
            useNewUrlParser: true,
            useUnifiedTopology: true // Подключение к серверу
        })

        app.listen(PORT, () => {
            console.log('Server started on port ', PORT) // Запуск севрера
        })
    } catch (e) {
        console.log(e)
    }
}


start()
