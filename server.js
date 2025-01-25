const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const mysql = require('mysql');

// Middleware za JSON podatke i CORS
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Povezivanje s MySQL bazom podataka
const connection = mysql.createConnection({
    host: 'student.veleri.hr',
    user: 'tmihelic',
    password: '11',
    database: 'tmihelic'
});

connection.connect((err) => {
    if (err) throw err;
    console.log("Connected to the database!");
});

// --- API za tablicu PROIZVOD ---

// Dohvat svih proizvoda
app.get("/api/proizvodi", (req, res) => {
    connection.query("SELECT * FROM PROIZVOD", (err, results) => {
        if (err) throw err;
        res.send(results);
    });
});

// Dohvat proizvoda prema ID-u
app.get("/api/proizvodi/:id", (req, res) => {
    const id = req.params.id;
    connection.query("SELECT * FROM PROIZVOD WHERE id = ?", [id], (err, results) => {
        if (err) throw err;
        res.send(results[0] || {});
    });
});

// Unos novog proizvoda
app.post("/api/unos_proizvoda", (req, res) => {
    const { proizvod, materijal, dimenzije, kolicina_na_skladistu, cijena, prodavac } = req.body;

    const query = "INSERT INTO PROIZVOD (proizvod, materijal, dimenzije, kolicina_na_skladistu, cijena, prodavac) VALUES (?, ?, ?, ?, ?, ?)";
    connection.query(query, [proizvod, materijal, dimenzije, kolicina_na_skladistu, cijena, prodavac], (err, results) => {
        if (err) throw err;
        res.send({ message: "Proizvod uspješno dodan!", id: results.insertId });
    });
});

// --- API za tablicu KUPOVINE ---

// Dohvat svih kupovina
app.get("/api/kupovine", (req, res) => {
    connection.query("SELECT * FROM KUPOVINE", (err, results) => {
        if (err) throw err;
        res.send(results);
    });
});

// Dohvat kupovine prema ID-u
app.get("/api/kupovine/:id", (req, res) => {
    const id = req.params.id;
    connection.query("SELECT * FROM KUPOVINE WHERE id = ?", [id], (err, results) => {
        if (err) throw err;
        res.send(results[0] || {});
    });
});

// Unos nove kupovine (s automatskim izračunom ukupne cijene) - zato imamo select
app.post("/api/unos_kupovine", (req, res) => {
    const { kupac_i_p, datum, kolicina_kupovine, proizvod_id } = req.body;

    // Dohvati cijenu proizvoda i provjeri količinu na skladištu
    connection.query("SELECT cijena, kolicina_na_skladistu FROM PROIZVOD WHERE id = ?", [proizvod_id], (err, results) => {
        if (err) {
            console.error("Greška pri dohvaćanju proizvoda:", err);
            res.status(500).send({ message: "Greška pri dohvaćanju proizvoda." });
            return;
        }

        if (results.length === 0) {
            return res.status(404).send({ message: "Proizvod s navedenim ID-em ne postoji!" });
        }

        const proizvod = results[0];
        const ukupna_cijena = proizvod.cijena * kolicina_kupovine;

        // Provjeri ima li dovoljno proizvoda na skladištu
        if (proizvod.kolicina_na_skladistu < kolicina_kupovine) {
            return res.status(400).send({ message: "Nedovoljna količina na skladištu." });
        }

        // Unesi kupovinu u bazu
        const queryInsert = `
          INSERT INTO KUPOVINE (kupac_i_p, datum, kolicina_kupovine, ukupna_cijena, proizvod_id)
          VALUES (?, ?, ?, ?, ?)
        `;
        connection.query(queryInsert, [kupac_i_p, datum, kolicina_kupovine, ukupna_cijena, proizvod_id], (err, results) => {
            if (err) {
                console.error("Greška pri unosu kupovine:", err);
                res.status(500).send({ message: "Greška pri unosu kupovine." });
                return;
            }

            // Ažuriraj količinu na skladištu
            const queryUpdate = `
              UPDATE PROIZVOD
              SET kolicina_na_skladistu = kolicina_na_skladistu - ?
              WHERE id = ?
            `;
            connection.query(queryUpdate, [kolicina_kupovine, proizvod_id], (err) => {
                if (err) {
                    console.error("Greška pri ažuriranju skladišta:", err);
                    res.status(500).send({ message: "Greška pri ažuriranju skladišta." });
                    return;
                }

                res.send({ message: "Kupovina uspješno dodana i količina na skladištu ažurirana!" });
            });
        });
    });
});



//DODAVANJE BRISANJA I AŽURIRANJA
app.delete("/api/proizvodi/:id", (req, res) => {
    const id = req.params.id;
  
    const query = "DELETE FROM PROIZVOD WHERE id = ?";
    connection.query(query, [id], (err, results) => {
      if (err) {
        console.error("Greška pri brisanju proizvoda:", err);
        res.status(500).send({ message: "Greška pri brisanju proizvoda." });
        return;
      }
      res.send({ message: "Proizvod uspješno obrisan!" });
    });
  });
  
  app.put("/api/proizvodi/:id", (req, res) => {
  const id = req.params.id;
  const { proizvod, materijal, dimenzije, kolicina_na_skladistu, cijena, prodavac } = req.body;

  const query = `
    UPDATE PROIZVOD
    SET proizvod = ?, materijal = ?, dimenzije = ?, kolicina_na_skladistu = ?, cijena = ?, prodavac = ?
    WHERE id = ?
  `;
  connection.query(query, [proizvod, materijal, dimenzije, kolicina_na_skladistu, cijena, prodavac, id], (err, results) => {
    if (err) {
      console.error("Greška pri ažuriranju proizvoda:", err);
      res.status(500).send({ message: "Greška pri ažuriranju proizvoda." });
      return;
    }
    res.send({ message: "Proizvod uspješno ažuriran!" });
  });
});

app.listen(3000, () => {
console.log("Server running on port 3000");
});