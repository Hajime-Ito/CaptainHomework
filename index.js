const moment = require('moment')
require('moment-timezone')
moment.tz.setDefault('Asia/Tokyo')
const admin = require("firebase-admin")
const express = require('express')
const bodyParser = require('body-parser')
const cron = require('node-cron')

// Instantiates Express and assigns our app variable to it
const app = express()
// Fetch the service account key JSON file contents
const serviceAccount = require("")
// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: ""
})
// As an admin, the app has access to read and write all data, regardless of Security Rules
var db = admin.database()
var ref = db.ref("/")
ref.once("value", function (snapshot) {
    console.log(snapshot.val())
})

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

//登録 [pass]
app.post('/regist', (req, res) => {
    let txt = req.body.text
    //既に存在していないか確認
    let ref = db.ref("/Todomember")

    try {
        ref.orderByChild("key").equalTo(txt).once('value', (snapshot) => {
            console.log(snapshot.val())
            if (snapshot.val() != null) res.end('そのパスワードは使えねぇなぁ。')
            else {
                let childkey = ref.push().key
                ref.child(childkey).update({
                    key: txt,
                    childkey: childkey
                }).then(() => {
                    res.end(txt + 'で登録したからな！忘れんなよ～')
                })
            }
        })
    } catch (e) { }
})

//[pass データ名 リセット日時]を登録
app.post('/set', (req, res) => {
    let txt = req.body.text
    let _txtarray = txt.split(' ')
    let pass = _txtarray[0]
    let todoName = _txtarray[1]
    let resetDate = _txtarray[2]
    let ref = db.ref("/Todolist")
    let date = { 日: '0', 月: '1', 火: '2', 水: '3', 木: '4', 金: '5', 土: '6' }

    try {
        let REF = db.ref('/Todomember').orderByChild("key").equalTo(pass)
        REF.once('value', (snapshot) => {
            console.log(snapshot.val())
            if (snapshot.val() == null) res.end('あれ？お前のデータはないな。パスワード間違ってねぇかい？')
        })

        let childkey = ref.push().key
        ref.child(childkey).update({
            todo: todoName,
            reset: date[resetDate], //曜日で管理
            key: pass,
            assesment: 0,
            childkey: childkey
        })
        res.end('オーキードーキー!' + todoName + 'はセットしといたぜい～')
    } catch (e) { }
})

//データの削除 [pass データ名]
app.post('/delete', (req, res) => {
    let txt = req.body.text
    let _txtarray = txt.split(' ')
    let pass = _txtarray[0]
    let todoName = _txtarray[1]
    let ref = db.ref("/Todolist")

    setTimeout(function () {
        res.end('お？兄ちゃんの言ってたデータはねぇなぁ。本当に"' + todoName + '"であってるのかぁ？')
    }, 1000)

    try {
        let REF = db.ref('/Todomember').orderByChild("key").equalTo(pass)
        REF.once('value', (snapshot) => {
            console.log(snapshot.val())
            if (snapshot.val() == null) res.end('あれ？お前のデータはないな。パスワード間違ってねぇかい？')
            else {
                ref.on('child_added', (snapshot) => {
                    if (snapshot.val().key == pass && snapshot.val().todo == todoName) {
                        ref.child(snapshot.val().childkey).update({
                            todo: null,
                            reset: null, //曜日で管理
                            key: null,
                            childkey: null,
                            assesment: null
                        })
                        res.end('あいよ。兄ちゃんの言ったデータ(' + todoName + ')は消しといた。')
                    }
                    ref.off()
                })
            }
        })
    } catch (e) { }

})

//toDoのアップデート [pass todoName 達成度]
app.post('/update', (req, res) => {
    let txt = req.body.text
    let _txtarray = txt.split(' ')
    let pass = _txtarray[0]
    let todoName = _txtarray[1]
    let assesment = _txtarray[2]
    let ref = db.ref("/Todolist")
    let ref1 = db.ref('/Todomember').child(pass)
    let numbers = [0, 1, 2, 3, 4, 5]
    let yesterday = [1, 2, 3, 4, 5, 0]
    let tmp = ''
    let today = moment().format('d')

    setTimeout(function () {
        res.end('おつかれい！' + todoName + 'はアップデートしといたぜ～　また頑張れよ！')
    }, 1000)

    try {
        let REF = db.ref('/Todomember').orderByChild("key").equalTo(pass)
        REF.once('value', (snapshot) => {
            console.log(snapshot.val())
            if (snapshot.val() == null) res.end('あれ？お前のデータはないな。パスワード間違ってねぇかい？')
            else {
                ref.on('child_added', (snapshot) => {
                    if (snapshot.val().key == pass && snapshot.val().todo == todoName) {
                        ref.child(snapshot.val().childkey).update({
                            assesment: assesment
                        }).then(() => {
                            ref1.update({
                                text: ''
                            })

                            ref.on('child_added', (snapshot) => {
                                if (snapshot.val().key == pass) {
                                    let message = ''
                                    var reply = ''
                                    let assesment = snapshot.val().assesment
                                    let resetday = snapshot.val().reset
                                    let day = ['日', '月', '火', '水', '木', '金', '土']
                                    for (let n of numbers)
                                        if (assesment == n) {
                                            for (let n of numbers) {
                                                if (assesment == n) message += '▼'
                                                else message += 'ー'
                                            }
                                        }

                                    if (message != '')
                                        if (today == snapshot.val().reset && assesment == '5')
                                            reply = '*(today)' + snapshot.val().todo + '* (' + day[resetday] + ')[complete!]\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                                        else if (today == snapshot.val().reset)
                                            reply = '*(today)' + snapshot.val().todo + '* (' + day[resetday] + ')\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                                        else if (assesment == '5' && snapshot.val().reset == yesterday[today])
                                            reply = '*(!)' + snapshot.val().todo + '* (' + day[resetday] + ')[complete!]\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                                        else if (snapshot.val().reset == yesterday[today])
                                            reply = '*(!)' + snapshot.val().todo + '* (' + day[resetday] + ')\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                                        else if (assesment == '5')
                                            reply = '*' + snapshot.val().todo + '* (' + day[resetday] + ')[complete!]\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                                        else
                                            reply = '*' + snapshot.val().todo + '* (' + day[resetday] + ')\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                                    else
                                        reply = '*' + snapshot.val().todo + '* (' + day[resetday] + ')\n' + message + '\n\n'

                                    tmp += reply
                                    console.log(tmp)
                                    ref1.update({
                                        text: tmp
                                    })
                                }
                                ref.off()
                            })
                        })
                    }
                    ref.off()
                })
            }
        })
    } catch (e) { }
})

//resetdayを再設定する[pass todoName resetday]
app.post('/resetday', (req, res) => {
    let txt = req.body.text
    let _txtarray = txt.split(' ')
    let pass = _txtarray[0]
    let todoName = _txtarray[1]
    let resetDate = _txtarray[2]
    let ref = db.ref("/Todolist")
    let date = { 日: '0', 月: '1', 火: '2', 水: '3', 木: '4', 金: '5', 土: '6' }
    let ref1 = db.ref('/Todomember').child(pass)
    let numbers = [0, 1, 2, 3, 4, 5]
    let yesterday = [1, 2, 3, 4, 5, 0]
    let tmp = ''
    let today = moment().format('d')

    try {
        let REF = db.ref('/Todomember').orderByChild("key").equalTo(pass)
        REF.once('value', (snapshot) => {
            console.log(snapshot.val())
            if (snapshot.val() == null) res.end('あれ？お前のデータはないな。パスワード間違ってねぇかい？')
        })

        ref.on('child_added', (snapshot) => {
            if (snapshot.val().key == pass && snapshot.val().todo == todoName) {
                ref.child(snapshot.val().childkey).update({
                    reset: date[resetDate]
                }).then(() => {
                    ref1.update({
                        text: ''
                    })

                    ref.on('child_added', (snapshot) => {
                        if (snapshot.val().key == pass) {
                            let message = ''
                            var reply = ''
                            let assesment = snapshot.val().assesment
                            let resetday = snapshot.val().reset
                            let day = ['日', '月', '火', '水', '木', '金', '土']
                            for (let n of numbers)
                                if (assesment == n) {
                                    for (let n of numbers) {
                                        if (assesment == n) message += '▼'
                                        else message += 'ー'
                                    }
                                }

                            if (message != '')
                                if (today == snapshot.val().reset && assesment == '5')
                                    reply = '*(today)' + snapshot.val().todo + '* (' + day[resetday] + ')[complete!]\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                                else if (today == snapshot.val().reset)
                                    reply = '*(today)' + snapshot.val().todo + '* (' + day[resetday] + ')\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                                else if (assesment == '5' && snapshot.val().reset == yesterday[today])
                                    reply = '*(!)' + snapshot.val().todo + '* (' + day[resetday] + ')[complete!]\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                                else if (snapshot.val().reset == yesterday[today])
                                    reply = '*(!)' + snapshot.val().todo + '* (' + day[resetday] + ')\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                                else if (assesment == '5')
                                    reply = '*' + snapshot.val().todo + '* (' + day[resetday] + ')[complete!]\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                                else
                                    reply = '*' + snapshot.val().todo + '* (' + day[resetday] + ')\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                            else
                                reply = '*' + snapshot.val().todo + '* (' + day[resetday] + ')\n' + message + '\n\n'

                            tmp += reply
                            console.log(tmp)
                            ref1.update({
                                text: tmp
                            })
                        }
                        ref.off()
                    })
                })

                res.end('おつかれい！' + todoName + 'は' + resetDate + '曜日にセットしといたぜ～　また頑張れよ！')
            }
            ref.off()
        })
    } catch (e) { }
})

app.post('/watch', (req, res) => {
    let pass = req.body.text//...['password']
    let ref1 = db.ref('/Todomember').child(pass)
    ref1.once('value', (snapshot) => {
        res.end(snapshot.val().text)
    })
})

app.post('/home', (req, res) => {
    let text = 'Homeworkシステムの使い方を説明します。\n'
        + ' *コマンドと入力文字の間は必ず空白を入れてください。曜日は”月”のように漢字単体で入力してください。* \n'
        + '1. `"/regist　パスワード"` で自分のアカウントを登録します。\n'
        + '2. `"/set　パスワード　宿題名　リセット曜日"` で宿題とリセット曜日を登録します。\n'
        + 'リセット曜日とは、進歩を０にリセットする曜日です。\n'
        + '宿題は一般的に毎週出るものなので進度を毎週リセットするほうが便利ですね。\n'
        + '3. `"/update　パスワード　宿題名　進度(0~5までの数字、またはメモ)"` \n'
        + '(0~5)までの数字を進度として入力すると、簡易なグラフとして表示されるようになります\n'
        + '4. `"/delete パスワード　宿題名"` で選択した宿題は削除されます。\n'
        + '5. `"/watch　パスワード"` であなたの宿題のデータを表示します。\n'
        + '6.`"/resetday　パスワード　宿題名　リセット曜日"` でリセット曜日を設定しなおせます。\n'
        + 'Example: \n\n*宿題名*  \n`[S]ーーー▼ーー[G]`  (60%)\n'
        + '\nつまりHomeworkシステムとはSlackで簡単に宿題の進行状況を管理できるシステムなのです。\nみなさん、このシステムで宿題の提出忘れを減らし、授業に関するストレスなく自主活動を進めていきましょう！'
    res.end(text)
})

cron.schedule('59 59 17 * * *', () => {
    let today = moment().format('d')
    let ref = db.ref("Todolist/")
    ref.on('child_added', (snapshot) => {
        if (snapshot.val().reset == today) {
            ref.update({
                assesment: '0'
            })
        }
    })
})

cron.schedule('0 0 0 * * *', () => {
    let pass = req.body.text//...['password']
    let ref = db.ref("Todolist/")
    let numbers = [0, 1, 2, 3, 4, 5]
    let today = moment().format('d')
    let yesterday = [1, 2, 3, 4, 5, 0]
    let tmp = ''

    let ref1 = db.ref('/Todomember').child(pass)
    ref.on('child_added', (snapshot) => {
        if (snapshot.val().key == pass) {
            let message = ''
            var reply = ''
            let assesment = snapshot.val().assesment
            let resetday = snapshot.val().reset
            let day = ['日', '月', '火', '水', '木', '金', '土']
            for (let n of numbers)
                if (assesment == n) {
                    for (let n of numbers) {
                        if (assesment == n) message += '▼'
                        else message += 'ー'
                    }
                }
            if (message != '')
                if (today == snapshot.val().reset && assesment == '5')
                    reply = '*(today)' + snapshot.val().todo + '* (' + day[resetday] + ')[complete!]\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                else if (today == snapshot.val().reset)
                    reply = '*(today)' + snapshot.val().todo + '* (' + day[resetday] + ')\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                else if (assesment == '5' && snapshot.val().reset == yesterday[today])
                    reply = '*(!)' + snapshot.val().todo + '* (' + day[resetday] + ')[complete!]\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                else if (snapshot.val().reset == yesterday[today])
                    reply = '*(!)' + snapshot.val().todo + '* (' + day[resetday] + ')\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                else if (assesment == '5')
                    reply = '*' + snapshot.val().todo + '* (' + day[resetday] + ')[complete!]\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
                else
                    reply = '*' + snapshot.val().todo + '* (' + day[resetday] + ')\n`|S|' + message + '|G|`  (' + assesment * 20 + '%)' + '\n\n'
            else
                reply = '*' + snapshot.val().todo + '* (' + day[resetday] + ')\n' + message + '\n\n'

            tmp += reply
            console.log(tmp)
            ref1.update({
                text: tmp
            })
        }
        ref.off()
    })
})

app.get('/todohajime', (req, res) => {
    res.end('thanks')
})

exports.app = functions.https.onRequest(app)
exports.cron = functions.https.onRequest(cron)