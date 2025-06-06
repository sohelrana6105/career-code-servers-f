const express = require("express");
const cors = require("cors");
require("dotenv").config();

const admin = require("firebase-admin");
const serviceAccount = require("./career-code-firebase-admin-service-key.json");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

// midlware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.2rg7znb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  autoSelectFamily: false,
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// firebase midleware
const verifyFirebaseToken = async (req, res, next) => {
  // console.log("token in the middleware", req.headers);
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "unauthorized accees" });
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    console.log("decoded token", decoded);
    req.decoded = decoded;
    next();
  } catch (error) {
    return res.status(401).send({ message: "unauthorized access" });
  }
};

// common midleware for avoid repeat
const verifyTokenEmail = (req, res, next) => {
  if (req.query.email !== req.decoded.email) {
    return res.status(403).message({ message: "forbidden access" });
  }
  next();
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const jobsCollection = client.db("careerCode").collection("jobs");
    const applicationCollection = client
      .db("careerCode")
      .collection("application");

    //jobs related api
    app.get("/jobs", async (req, res) => {
      const result = await jobsCollection.find().toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    // appllication related api
    app.get(
      "/application",
      verifyFirebaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const email = req.query.email;

        // if (email !== req.decoded.email) {
        //   return res.status(403).message({ message: "forbidden access" });
        // }

        const query = {
          applicant: email,
        };
        const result = await applicationCollection.find(query).toArray();
        res.send(result);
      }
    );

    app.post("/application", async (req, res) => {
      const appllication = req.body;
      // console.log(appllication);
      const result = await applicationCollection.insertOne(appllication);
      res.send(result);
    });

    // app.post("/jobs", async (req, res) => {
    //   const jobs = req.body;
    //   // console.log(appllication);
    //   const result = await applicationCollection.insertOne(jobs);
    //   res.send(result);
    // });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Career code ");
});
app.listen(port, (req, res) => {
  console.log(`Career code app listening on port ${port}`);
});
