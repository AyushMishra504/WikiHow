const express = require('express');
const cors = require('cors');

const wikiRouter = require('./Routes/GetWikiResult');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.use('/api/wiki', wikiRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
