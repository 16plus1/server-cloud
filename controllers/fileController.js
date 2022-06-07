const fileService = require('../services/fileService')
const config = require('config')
const fs = require('fs')
const User = require('../models/User')
const File = require('../models/File')
const Uuid = require('uuid')


class FileController {
    async createDir(req, res) { //Создание папок
        try {
            const { name, type, parent } = req.body
            const file = new File({ name, type, parent, user: req.user.id })
            const parentFile = await File.findOne({ _id: parent }) //Поиск родительской папки
            if (!parentFile) { //Если родительская папка не найдена, то новой папке присваевается путь корневого каталога
                file.path = name
                await fileService.createDir(req, file) //Создание папки и добавление ее в коллекция файл
            } else {
                file.path = `${parentFile.path}\\${file.name}` //ЕСли родительская папка найдена, то путь новой папки складывается из адреса родительской папки + адрес новой папки
                await fileService.createDir(req, file)
                parentFile.childs.push(file._id)
                await parentFile.save()
            }
            await file.save()
            return res.json(file)
        } catch (e) {
            console.log(e)
            return res.status(400).json(e)
        }
    }

    async getFiles(req, res) {
        try {
            const { sort } = req.query
            let files
            switch (sort) {
                case 'name': //Сортировка по полю имя
                    files = await File.find({ user: req.user.id, parent: req.query.parent }).sort({ name: 1 })
                    break
                case 'type': //Сортировка по полю тип
                    files = await File.find({ user: req.user.id, parent: req.query.parent }).sort({ type: 1 })
                    break
                case 'date': //Сортировка по полю дата
                    files = await File.find({ user: req.user.id, parent: req.query.parent }).sort({ date: 1 })
                    break
                default: //Сортировка по умолчанию
                    files = await File.find({ user: req.user.id, parent: req.query.parent })
                    break;
            }
            return res.json(files)
        } catch (e) {
            console.log(e)
            return res.status(500).json({ message: "Can not get files" })
        }
    }

    async uploadFile(req, res) {
        try {
            const file = req.files.file

            const parent = await File.findOne({ user: req.user.id, _id: req.body.parent }) //Поиск родительских папок
            const user = await User.findOne({ _id: req.user.id }) //Поиск пользователя по ID

            if (user.usedSpace + file.size > user.diskSpace) { //Проверка на наличие свободного места на диске
                return res.status(400).json({ message: 'Недостаточно места на диске' })
            }

            user.usedSpace = user.usedSpace + file.size //Расчет использованного места 

            let path;
            if (parent) {
                path = `${req.filePath}\\${user._id}\\${parent.path}\\${file.name}` //Присваивание пути файлу
            } else {
                path = `${req.filePath}\\${user._id}\\${file.name}`
            }

            if (fs.existsSync(path)) {
                return res.status(400).json({ message: 'Файл уже существует' }) //Ошибка при загрузке повторяющихся файлов
            }
            file.mv(path)

            const type = file.name.split('.').pop() //Установка разделителей в имени файла
            let filePath = file.name
            if (parent) {
                filePath = parent.path + "\\" + file.name // Присвоение пути
            }
            const dbFile = new File({ //Добавление нвоого файла в коллекцию
                name: file.name,
                type,
                size: file.size,
                path: filePath,
                parent: parent,
                user: user._id
            });

            await dbFile.save()
            await user.save()

            res.json(dbFile)
        } catch (e) {
            console.log(e)
            return res.status(500).json({ message: "Сервер не отвечает" }) //Серверная ошибка
        }
    }

    async downloadFile(req, res) {
        try {
            const file = await File.findOne({ _id: req.query.id, user: req.user.id })
            const path = fileService.getPath(rrq, file)
            if (fs.existsSync(path)) {
                return res.download(path, file.name) //загрузка файла
            }
            return res.status(400).json({ message: "Ошибка загрузки" }) //Ошибка загрузки файла
        } catch (e) {
            console.log(e)
            res.status(500).json({ message: "Ошибка загрузки" })
        }
    }

    async deleteFile(req, res) {
        try {
            const file = await File.findOne({ _id: req.query.id, user: req.user.id }) //Посик файла по ID
            if (!file) {
                return res.status(400).json({ message: 'Файл не найден' })
            }
            fileService.deleteFile(req, file)
            await file.remove()
            return res.json({ message: 'Файл был удален' }) //Уведомление об успешном удалении файла
        } catch (e) {
            console.log(e)
            return res.status(400).json({ message: 'Папка пуста' })
        }
    }
    async searchFile(req, res) { //Поиск файлов
        try {
            const searchName = req.query.search
            let files = await File.find({ user: req.user.id }) // ПОиск пользовательского каталога по ID
            files = files.filter(file => file.name.includes(searchName)) //Поиск файла по введеному значению
            return res.json(files)
        } catch (e) {
            console.log(e)
            return res.status(400).json({ message: 'Ошибка поиска' })
        }
    }

    async uploadAvatar(req, res) {
        try {
            const file = req.files.file
            const user = await User.findById(req.user.id)
            const avatarName = Uuid.v4() + ".jpg"
            file.mv(config.get('staticPath') + "\\" + avatarName)
            user.avatar = avatarName
            await user.save()
            return res.json(user)
        } catch (e) {
            console.log(e)
            return res.status(400).json({ message: 'Upload avatar error' })
        }
    }

    async deleteAvatar(req, res) {
        try {
            const user = await User.findById(req.user.id)
            const avatarName = Uuid.v4() + ".jpg"
            fs.unlinkSync(config.get('staticPath') + "\\" + avatarName)
            user.avatar = null
            await user.save()
            return res.json(user)
        } catch (e) {
            console.log(e)
            return res.status(400).json({ message: 'Delete avatar error' })
        }
    }
}

module.exports = new FileController()