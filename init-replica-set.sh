#!/bin/bash

echo "Initializing MongoDB replica set..."

# Wait for MongoDB to be ready
sleep 5

# Initialize replica set
docker exec mongodb mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"

echo "Replica set initialized!"
echo "You can check the status with: docker exec mongodb mongosh --eval 'rs.status()'"

