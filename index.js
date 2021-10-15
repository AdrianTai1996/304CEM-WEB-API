var express = require('express');
var app = express();
const bodyParser = require('body-parser');
const Pool = require('pg').Pool;
var config = require('./env.json')['DBCONFIG'];
// var port = require('./env.json')['PORT'];
const cors = require('cors');
const axios = require('axios');

app.use(
	cors({
		origin: true,
		credentials: true,
	})
);

app.use(express.json());
app.use(bodyParser.json());
app.use(
	bodyParser.urlencoded({
		extended: true,
	})
);

const pool = new Pool(config);

app.post('/register', async (request, response) => {
	const isAvai = await pool.query('SELECT * FROM users where email = $1', [
		request.body.email,
	]);
	if (isAvai.rowCount > 0) {
		response.json({ success: false, message: 'This email is already taken.' });
	} else {
		const result = await pool.query(
			'INSERT INTO users(name, email, password) VALUES ($1, $2, $3)',
			[request.body.name, request.body.email, request.body.password]
		);
		response.json({ success: true, message: 'Successfully registered.' });
	}
});

app.post('/login', async (request, response) => {
	const isAvai = await pool.query(
		'SELECT * FROM users where email = $1 AND password = $2',
		[request.body.email, request.body.password]
	);
	if (isAvai.rowCount > 0) {
		response.json({
			success: true,
			message: 'Successfully login',
			data: isAvai.rows[0],
		});
	} else {
		response.json({
			success: false,
			message: 'Sorry, your email or password is incorrect. Please try again.',
		});
	}
});

app.get('/getCrypto', async (request, response) => {
	const result = await axios.get(
		'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false'
	);
	/**
	 * Sorting functions
	 */
	result.data = result.data.sort(function (a, b) {
		if (a.id < b.id) {
			return -1;
		}
		if (a.id > b.id) {
			return 1;
		}
		return 0;
	});

	if (response.statusCode == 200) {
		response.json(result.data);
	} else {
		response.json({ success: false, message: 'Error loading data.' });
	}
});

app.get('/cryptoDetails/:crypto', async (request, response) => {
	/**
	 * Conditioning/Filtering functions
	 */
	const result = await axios.get(
		`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${request.params.crypto}&order=market_cap_desc&per_page=100&page=1&sparkline=false`
	);
	if (response.statusCode == 200) {
		response.json(result.data);
	} else {
		response.json({ success: false, message: 'Error loading data.', data: [] });
	}
});

app.get('/favourites/:userId', async (request, response) => {
	const isAvai = await pool.query(
		'SELECT crypto_name FROM favourites where user_id = $1',
		[request.params.userId]
	);
	if (isAvai.rowCount > 0) {
		/**
		 * Sorting functions
		 */
		const allCryptos = isAvai.rows.map((val) => val.crypto_name).sort();
		response.json({ success: true, message: 'Success', data: allCryptos });
	} else {
		response.json({
			success: false,
			message: 'No favourites',
			data: [],
		});
	}
});

app.post('/checkFav/', async (request, response) => {
	/**
	 * HTTP Post
	 */
	const isAvai = await pool.query(
		'SELECT * FROM favourites where crypto_name = $1 and user_id = $2',
		[request.body.cryptoName, request.body.userId]
	);
	if (isAvai.rowCount > 0) {
		response.json({ success: true, message: 'Success', data: isAvai.rows });
	} else {
		response.json({
			success: false,
			message: 'No favourites',
			data: [],
		});
	}
});

app.post('/addFav', async (request, response) => {
	/**
	 * HTTP Post
	 */
	const isAvai = await pool.query(
		'SELECT * FROM favourites where crypto_name = $1 AND user_id = $2',
		[request.body.cryptoName, request.body.userId]
	);
	if (isAvai.rowCount > 0) {
		response.json({
			success: false,
			message: 'Already in your favourites.',
		});
	} else {
		const result = await pool.query(
			'INSERT INTO favourites (crypto_name, user_id) VALUES ($1, $2) RETURNING id, crypto_name, user_id',
			[request.body.cryptoName, request.body.userId]
		);
		response.json({
			success: true,
			message: 'Successfully added to your favourites.',
			data: result.rows,
		});
	}
});

app.delete('/removeFav/:id', async (request, response) => {
	/**
	 * HTTP Delete
	 */
	const isAvai = await pool.query('SELECT * FROM favourites where id = $1', [
		request.params.id,
	]);
	if (isAvai.rowCount > 0) {
		await pool.query('DELETE FROM favourites WHERE id = $1', [
			request.params.id,
		]);
		response.json({
			success: true,
			message: 'Successfully removed from your favourites.',
		});
	} else {
		response.json({
			success: false,
			message: 'Sorry, this crypto is not in your favourites.',
		});
	}
});

app.listen(process.env.PORT, async function () {
	pool.connect();
	console.log(`Sample app listening on port ${process.env.PORT}!`);
});
