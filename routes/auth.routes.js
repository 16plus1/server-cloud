const Router = require("express"); // Импорт маршрута
const User = require("../models/User") // Сущность пользователя
const bcrypt = require("bcryptjs")
const config = require("config")
const jwt = require("jsonwebtoken")
const { check, validationResult } = require("express-validator")
const router = new Router()
const authMiddleware = require('../middleware/auth.middleware')
const fileService = require('../services/fileService')
const File = require('../models/File')

// POST-запрос функции регистрации
router.post('/registration', [
        check('email', "Некорректный e-mail").isEmail(),
        check('password', 'Пароль должен быть не короче 5 и не длиннее 20 символов').isLength({ min: 5, max: 20 }) //Ограничения для ввода пароля
    ],
    async(req, res) => {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return res.status(400).json({ message: "Некорректный запрос", errors })
            }
            const { email, password, password1 } = req.body
            const candidate = await User.findOne({ email }) //Поиск адреса электронноц поты в БД
            if (candidate) {
                return res.status(400).json({ message: `Пользователь с таким e-mail ${email} уже существует` }) //Ошибка при вводе электроной почты, зарегистрированного в системе
            }

            if (password != password1) {
                return res.status(400).json({ message: `Пароли не совпадают!` }) // Ошибка при вводе несовпадающих паролей

            }
            const hashPassword = await bcrypt.hash(password, 8) // Шифрвание пароля
            const user = new User({ email, password: hashPassword }) //Добавление нового пользователя. Присвоения ему пароля и логина
            await user.save()
            await fileService.createDir(req, new File({ user: user.id, name: '' }))
            res.json({ message: "Пользователь успешно зарегистрирован" }) //Уведомление об успешной регитсрации
        } catch (e) {
            console.log(e)
            res.send({ message: "Сервер не отвечает" })
        }
    })


router.post('/login',
    async(req, res) => {
        try {
            const { email, password } = req.body
            const user = await User.findOne({ email }) //Поиск пользователя в бд
            if (!user) {
                return res.status(404).json({ message: "Пользователь не найден" }) //Оибка при вводе не зарегистрированного пользователя
            }
            const isPassValid = bcrypt.compareSync(password, user.password)
            if (!isPassValid) {
                return res.status(400).json({ message: "Неверный пароль" }) //Ошибка при вводе неправильного пароля
            }
            const token = jwt.sign({ id: user.id }, config.get("secretKey"), { expiresIn: "1h" }) // Присваивание пользлователю токена
            return res.json({
                token,
                user: { // Возвращение клиенту данных по токену
                    id: user.id,
                    email: user.email,
                    diskSpace: user.diskSpace,
                    usedSpace: user.usedSpace,
                    avatar: user.avatar
                }
            })
        } catch (e) {
            console.log(e)
            res.send({ message: "Сервер не отвечает" })
        }
    })

router.get('/auth', authMiddleware,
    async(req, res) => {
        try {
            const user = await User.findOne({ _id: req.user.id })
            const token = jwt.sign({ id: user.id }, config.get("secretKey"), { expiresIn: "1h" })
            return res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    diskSpace: user.diskSpace,
                    usedSpace: user.usedSpace,
                    avatar: user.avatar
                }
            })
        } catch (e) {
            console.log(e)
            res.send({ message: "Сервер не отвечает" })
        }
    })


module.exports = router