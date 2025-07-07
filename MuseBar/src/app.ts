import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API MuseBar opérationnelle' });
});

app.listen(PORT, () => {
  console.log(`Serveur MuseBar backend lancé sur http://localhost:${PORT}`);
}); 