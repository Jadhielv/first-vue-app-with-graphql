import express from 'express';
const sqlite3 = require('sqlite3').verbose();

import ExpressGraphQL from "express-graphql";
import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLList, GraphQLNonNull, GraphQLSchema } from "graphql";

import cors from 'cors';
const app = express();
app.use(cors())

const database = new sqlite3.Database("./my.db");

const createContactTable = () => {
    const query = `
        CREATE TABLE IF NOT EXISTS contacts (
        id integer PRIMARY KEY,
        firstName text,
        lastName text,
        email text UNIQUE)`;

    return database.run(query);
}

createContactTable();

const ContactType = new GraphQLObjectType({
    name: "Contact",
    fields: {
        id: { type: GraphQLID },
        firstName: { type: GraphQLString },
        lastName: { type: GraphQLString },
        email: { type: GraphQLString }
    }
});

var queryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
        contacts: {
            type: GraphQLList(ContactType),
            resolve: (root, args, context, info) => {
                return new Promise((resolve, reject) => {

                    database.all("SELECT * FROM contacts;", function (err, rows) {
                        if (err) {
                            reject([]);
                        }
                        resolve(rows);
                    });
                });
            }
        },
        contact: {
            type: ContactType,
            args: {
                id: {
                    type: new GraphQLNonNull(GraphQLID)
                }
            },
            resolve: (root, { id }, context, info) => {
                return new Promise((resolve, reject) => {
                    database.all("SELECT * FROM contacts WHERE id = (?);", [id], function (err, rows) {
                        if (err) {
                            reject(null);
                        }
                        resolve(rows[0]);
                    });
                });
            }
        }
    }
});

var mutationType = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        createContact: {
            type: ContactType,
            args: {
                firstName: {
                    type: new GraphQLNonNull(GraphQLString)
                },
                lastName: {
                    type: new GraphQLNonNull(GraphQLString)
                },
                email: {
                    type: new GraphQLNonNull(GraphQLString)
                }
            },
            resolve: (root, { firstName, lastName, email }) => {
                return new Promise((resolve, reject) => {

                    database.run('INSERT INTO contacts (firstName, lastName, email) VALUES (?,?,?);', [firstName, lastName, email], (err) => {
                        if (err) {
                            reject(null);
                        }
                        database.get("SELECT last_insert_rowid() as id", (err, row) => {

                            resolve({
                                id: row["id"],
                                firstName: firstName,
                                lastName: lastName,
                                email: email
                            });
                        });
                    });
                })
            }
        },
        updateContact: {
            type: GraphQLString,
            args: {
                id: {
                    type: new GraphQLNonNull(GraphQLID)
                },
                firstName: {
                    type: new GraphQLNonNull(GraphQLString)
                },
                lastName: {
                    type: new GraphQLNonNull(GraphQLString)
                },
                email: {
                    type: new GraphQLNonNull(GraphQLString)
                }
            },
            resolve: (root, { id, firstName, lastName, email }) => {
                return new Promise((resolve, reject) => {

                    database.run('UPDATE contacts SET firstName = (?), lastName = (?), email = (?) WHERE id = (?);', [firstName, lastName, email, id], (err) => {
                        if (err) {
                            reject(err);
                        }
                        resolve(`Contact #${id} updated`);
                    });
                })
            }
        },
        deleteContact: {
            type: GraphQLString,
            args: {
                id: {
                    type: new GraphQLNonNull(GraphQLID)
                }
            },
            resolve: (root, { id }) => {
                return new Promise((resolve, reject) => {

                    database.run('DELETE from contacts WHERE id =(?);', [id], (err) => {
                        if (err) {
                            reject(err);
                        }
                        resolve(`Contact #${id} deleted`);
                    });
                })
            }
        }
    }
});

const schema = new GraphQLSchema({
    query: queryType,
    mutation: mutationType
});

app.use("/graphql", ExpressGraphQL({ schema: schema, graphiql: true }));

app.listen(4000, () => {
    console.log("GraphQL server running at http://localhost:4000.");
});
