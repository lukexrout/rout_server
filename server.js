// const PORT = process.env.PORT || 3000
const fs = require('fs')
const https = require('https');
const express = require('express')
const pool = require('./db')
const cors = require('cors')
const bcrypt = require('bcrypt')
const getToken = require('crypto');
const AWS = require('aws-sdk')
const multer = require('multer')

const folder = multer({ dest: './assets'})

const privateKey = fs.readFileSync('./localhost-key.pem', 'utf8')
const certificate = fs.readFileSync('./localhost.pem', 'utf8')

// console.log(privateKey)
// console.log(certificate)

const credentials = {
    key: privateKey,
    cert: certificate
}
// const execSync = require('child_process').execSync

// const output = execSync('heroku config api-inv-fou:get DATABASE_URL', { encoding: 'utf-8' })
// console.log(output)

// AWS.config.update({
//     accessKeyId: 'AKIAXGKPKLVUVF7ZSABA',
//     secretAccessKey: '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'
// })

// const s3 = new AWS.S3()


const app = express()

// app.use(upload())
app.use(cors({ origin: ['https://localhost:3000']}))
app.use(express.urlencoded({ extended: false }));
app.use(express.json())
// app.use(multer())

//ROUTES//

app.get('/upload-url', async (req, res) => {
    

    // console.log(req.body.hi)
    // const URL = s3.getSignedUrl('putObject', {Bucket: 'rout-media-storage', Key: 'photo00', Expires: 60})

    try {
        res.status(200).send('hello world')
    } catch (err) {
        console.log(err) 
    }
})







app.post('/register', async (req, res) => {
    const query = await pool.query('SELECT email FROM users WHERE email = $1', [req.body.email])
    const exist = ((query.rows).map(({ email }) => email)).toString()
    if (exist === req.body.email) {
        res.status(400).send('User with this email already exists')
    } else {
        const hashedPassword = await bcrypt.hash(req.body.password, 12)
        const tokenize = getToken.randomBytes(17)
        const token = tokenize.toString('hex')
        const users = [req.body.email, req.body.username, hashedPassword, token]
        console.log(users)
        
        try {
            const createUser = await pool.query(
            'INSERT INTO "users" (email, username, password, loginId) VALUES ($1, $2, $3, $4) RETURNING *', users)
            
            res.json(createUser.rows[0])
        } catch(err) {
            res.status(500).send(err.message)
        }
    }
})

app.post('/login', async (req, res) => {
    const query = await pool.query('SELECT email FROM users WHERE email = $1', [req.body.email])
    const query_two = await pool.query('SELECT password FROM users WHERE email = $1', [req.body.email])
    const ok = query.rows.map(({ email }) => email)
    const exist = ((query.rows).map(({ email }) => email)).toString()
    const compare = ((query_two.rows).map(({ password }) => password)).toString()

    const query_three = await pool.query('SELECT id FROM users WHERE email = $1', [req.body.email])
    const boo = ((query_three.rows).map(({ id }) => id)).toString()

    console.log(ok)

    if (exist !== req.body.email) {
        return res.status(400).send('User does not exist with this email')
    } else {
        try {
            if (await bcrypt.compare(req.body.password, compare)) {
                // console.log('user_id: ' + boo)
                res.status(201).send(boo)
            } else {
                res.status(404).send("User with this password doesn't exist")
            }
        } catch(err) {
            res.status(500).send(err.message)
        }
    }
})

app.post('/follow', async (req, res) => {
    const query = await pool.query('SELECT username FROM users WHERE loginid = $1', [req.body.user_id])
    const username_one = query.rows.map(({ username }) => username).toString()
    const query_two = await pool.query('SELECT username FROM users WHERE username = $1', [req.body.username])
    const username_two = query_two.rows.map(({ username }) => username).toString()
    const follow = [username_one, username_two]

    try{
        const push = await pool.query('INSERT INTO "follows" (user_one, user_two) VALUES ($1, $2) RETURNING *', follow)
        res.status(200).send(push.rows)
    } catch (err) {
        res.status(404).send(err.message)
    }
})

app.post('/discover', async (req, res) => {
    const query = await pool.query('SELECT * FROM follows WHERE user_one = $1 AND user_two ~ $2', [req.body.username, req.body.input])
    const following = query.rows.map(({ user_two }) => user_two)
    const query_two = await pool.query('SELECT * FROM follows WHERE user_two = $1 AND user_one ~ $2', [req.body.username, req.body.input])
    const followed = query_two.rows.map(({ user_one }) => user_one)
    // const query_three = await pool.query('SELECT * FROM users WHERE username ~ $1', [req.body.input])
    // const users = query_three.rows.map(({ username }) => username)
    // console.log(users)
    // const arr = [following, followed]
    console.log(['Following: ' + following.length, 'Followed: ' + followed.length])
    if (following.length <= 5) {
        const followed_num = 5 - following.length
        var arr = [followed.slice(0, followed_num - 1)]
        console.log(arr)
    }
    try {
        res.status(200).send([following, followed])
        // res.status(200).send([users])
    } catch (err) {
        res.status(404).send(err.message)
    }
})

app.post('/follow_count', async (res, req) => {
    const query = await pool.query('SELECT user_two FROM follows WHERE user_one = $1', [req.body.login_id])
    const number_follow = query.rows.map(({ user_two }) => user_two).length
    console.log(number_follow)
})

app.post('/search', async (req, res) => {

    const query = await pool.query('SELECT * FROM users LIMIT $1', [req.body.count])

    try {
        res.status(200).send(query.rows)
    } catch (err) {
        res.status(404).send(err.message)
    }
})













app.get('/users', async (req, res) => {
    const query = await pool.query('SELECT * FROM users;')

    try {
        res.status(200).send(query.rows)
    } catch (err) {
        res.status(404).send(err.message)
    }



})



const httpsServer = https.createServer(credentials, app)

// console.log(httpsServer.listen)


// app.listen(3000, () => {console.log('server has started on port 3000')})
httpsServer.listen(3000, () => {console.log('server has started on port ' + 3000)})





// psql ^
// --host=<DB instance endpoint> ^
// --port=<port> ^
// --username=<master username> ^
// --password ^
// --dbname=<database name> 

// psql --host=rout.cmw3g4zmpga6.us-east-2.rds.amazonaws.com --port=5432 --username=postgres --password --dbname=routdev