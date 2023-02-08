const fs = require('fs')
const https = require('https');
const express = require('express')
const pool = require('./db')
const cors = require('cors')
const bcrypt = require('bcrypt')
const getToken = require('crypto');
const multer = require('multer')

// depricated ////////////////////////////////
// const privateKey = fs.readFileSync('./localhost-key.pem', 'utf8')
// const certificate = fs.readFileSync('./localhost.pem', 'utf8')
// const credentials = {
//     key: privateKey,
//     cert: certificate
// }
// depricated ///////////////////////////////

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'assets/')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now())
    }
})
const upload = multer({ storage: storage})

const app = express()

app.use(cors({ origin: '*'}))
app.use(express.urlencoded({ extended: false }));
app.use(express.json())

//ROUTES//

app.post('/register', async (req, res) => {
    const query = await pool.query('SELECT email FROM users WHERE email = $1', [req.body.email])
    const exist = ((query.rows).map(({ email }) => email)).toString()
    if (exist === req.body.email) {
        res.status(400).send('User with this email already exists')
    } else {
        const hashedPassword = await bcrypt.hash(req.body.password, 12)
        const tokenize = getToken.randomBytes(17)
        const token = tokenize.toString('hex')
        const user = [req.body.username, hashedPassword, req.body.email, token]
        console.log(user)
        
        try {
            const createUser = await pool.query(
            'INSERT INTO "users" (username, password, email, id) VALUES ($1, $2, $3, $4) RETURNING *', user)
            
            res.json(createUser.rows[0])
        } catch(err) {
            res.status(500).send(err.message)
        }
    }
})

app.post('/login', async (req, res) => {
    const query = await pool.query('SELECT username FROM users WHERE username = $1', [req.body.username])
    const query_two = await pool.query('SELECT password FROM users WHERE username = $1', [req.body.username])
    const ok = query.rows.map(({ username }) => username)
    const exist = ((query.rows).map(({ username }) => username)).toString()
    const compare = ((query_two.rows).map(({ password }) => password)).toString()

    const query_three = await pool.query('SELECT id FROM users WHERE username = $1', [req.body.username])
    const boo = ((query_three.rows).map(({ id }) => id)).toString()

    console.log(ok)

    if (exist !== req.body.username) {
        return res.status(400).send('User does not exist with this username')
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

app.post('/profile_user', async (req, res) => {
    const query = await pool.query('SELECT username FROM users WHERE id = $1', [req.body.self])
    const username = query.rows.map(({ username }) => username).toString()


    try {
        res.status(200).send(username)
    } catch (err) {
        res.status(404).send(err.message)
    }

})

app.post('/follow', async (req, res) => {
    const query = await pool.query('SELECT username FROM users WHERE username = $1', [req.body.user])
    const user = query.rows.map(({ username }) => username).toString()
    const follow = [req.body.self, user]

    const exist = await pool.query('SELECT _user FROM relations WHERE self = $1 AND _user = $2', [req.body.self, user])
    const map_exist = exist.rows.map(({ _user }) => _user).length

    try{
        if (map_exist === 1) {
            res.status(404).send(req.body.user + ' already followed')
        } else if (map_exist !== 1) {
            const push = await pool.query('INSERT INTO "relations" (self, _user) VALUES ($1, $2) RETURNING *', follow)
            res.status(200).send(push.rows)
        }
    } catch (err) {
        res.status(404).send(err.message)
    }
})

app.post('/unfollow', async (req, res) => {
    const query = await pool.query('DELETE FROM relations WHERE self = $1 AND _user = $2', [req.body.self, req.body.user])

    try {
        res.status(200).send(req.body.unfollow_username + ' unfollowed.')
    } catch (err) {
        res.status(404).send(err.message)
    }
})

app.post('/follow_count', async (req, res) => {

    const query = await pool.query('SELECT self FROM relations WHERE _user = $1', [req.body.username])
    const follow_count = query.rows.map(({ self }) => self).length.toString()

    try {
        res.status(200).send(follow_count)
    } catch (err) {
        res.status(404).send(err.message)
    }

})

app.post('/follow_list', async (req, res) => {

    const query = await pool.query('SELECT self FROM relations WHERE _user = $1', [req.body.username])
    const map = query.rows.map(({ self }) => self)

    try {
        res.status(200).send(map)
    } catch (err) {
        res.status(404).send(err.message)
    }
})

app.post('/following_count', async (req, res) => {

    const query = await pool.query('SELECT _user FROM relations WHERE self = $1', [req.body.username])
    const following_count = query.rows.map(({ _user }) => _user).length.toString()

    try {
        res.status(200).send(following_count)
    } catch (err) {
        res.status(404).send(err.message)
    }

})

app.post('/following_list', async (req, res) => {

    const query = await pool.query('SELECT _user FROM relations WHERE self = $1', [req.body.username])
    const map = query.rows.map(({ _user }) => _user)

    try {
        res.status(200).send(map)
    } catch (err) {
        res.status(404).send(err.message)
    }

})

app.post('/follow_check', async (req, res) => {

    const query = await pool.query('SELECT _user FROM relations WHERE self = $1 AND _user = $2', [req.body.self, req.body._user])
    const map = query.rows.map(({ _user }) => _user)

    console.log(map)

    let i = null

    {map.length === 0 ? i = false : i = true }

    try {
        res.status(200).send(i)
    } catch (err) {
        res.status(404).send(err.message)
    }


})

app.post('/search', async (req, res) => {

    const query = await pool.query('SELECT * FROM users WHERE username ~ $1 LIMIT $2', [req.body._user, req.body.count])
    const map = query.rows.map(({ username }) => username)

    try {
        res.status(200).send(map)
    } catch (err) {
        res.status(404).send(err.message)
    }

})

app.post('/upload', upload.single('file'), async (req, res) => {
    console.log(req.files) 

    try {
        res.status(200).send({ success: true })
        // console.log(res)
    } catch (err) {
        res.status(404).send(err.message)
    }

})















// dev

app.get('/users', async (req, res) => {
    const query = await pool.query('SELECT * FROM users;')

    try {
        res.status(200).send(query.rows)
    } catch (err) {
        res.status(404).send(err.message)
    }



})


app.post('/get_user', async (req, res) => {
    const query = await pool.query('SELECT * FROM users WHERE username ~ $1', [req.body.user])
    const user_list = query.rows.map(({ username }) => username)

    try {
        res.status(200).send(user_list)
    } catch (err) {
        res.status(404).send(err.message)
    }

})

app.listen(3000, () => {console.log('server has started on port 3000')})

// depricated //
// const httpsServer = https.createServer(credentials, app)
// httpsServer.listen(3000, () => {console.log('server has started on port ' + 3000)})
// depricated //
