# Kong API Gateway on Amazon ECS with Service Discovery

This project contains the CloudFormation templates to deploy a Kong API Gateway container behind an Application Load Balancer to expose APIs.

## Infrastructure

![Infrastructure Diagram](./images/Project1-Infrastructure.png)
The Kong API Gateway container and API containers are deployed in private subnets. The Postgres RDS Instance needed for Kong is also deployed in private subnets. The images needed for the containers are stored in Elastic Container Registry.\
The Application Load Balancer is deployed across 3 Public Subnets in 3 different availability zones for High Availability. The Kong Container is the target group for Application Load Balancer.\
The API Containers are using ECS Service Discovery because the Kong API Gateway container needs to know the URL of API Containers. So by enabling Service Discovery, a static endpoint can be used to facilitate the discovery of new services(APIs).

## Application

![Application Diagram](./images/Project1-Application.png)
The Kong Container listens on `8000` port for general users to access the APIs. The Kong Container listens on `8001` port for admin user to create services, create routes, enable plugins, etc.\
Kong Container uses Postgres database to store registered APIs, plugins, and consumers.\
The Kong Container also interacts with API Container to serve the API requests to user(s).

## APIs

[See the APIs](./Api/app.js "See the APIs")\
[See the Dockerfile for API Container's Image](./Api/Dockerfile "See the Dockerfile for API Container's Image")

## CloudFormation Templates

**Main Stack:** Deploys VPC Stack, Security Groups Stack, RDS Stack, Application Load Balancer Stack, ECS Stack

- **VPC Stack:** Deploys a VPC, 3 Public Subnets, 3 Private Subnets, 1 Public Route Table, 1 Private Route Table, 1 NAT Gateway, 1 Internet Gateway
- **Security Groups Stack:** Deploys Security Groups for ECS EC2 Instances, Application Load Balancer
- **RDS Stack:** Deploys RDS Instance, Security Group for RDS Instance, And DBSubnetGroup
- **ALB Stack:** Deploys Application Load Balancer, Target Groups and Listeners
- **ECS Stack:** Deploys ECS Cluster, 2 Task Definitions, 2 Services, CloudWatch Log Groups, Service Registry and Private Namespace for Service Discovery, EC2 Instances, Launch Configuration, AutoScaling Group, Roles needed for resources (2 services- Kong API Gateway, Node App for APIs)

## Instructions to use the  template to deploy the infrastructure

- Step 1: Customize the parameters in the templates according to your requirement
- Step 2: Upload the templates in a S3 Bucket
- Step 3: Update the `TemplateURL` of each resource in main.yml
- Step 4: Deploy the `main.yml` stack on CloudFormation
- Step 5 (Optional): Create a Route53 record to route traffic to Application Load Balancer and use the Route 53 record to interact with Kong API Gateway

## Using Kong API Gateway

### Test Kong Admin API is working

```bash
curl --location --request GET 'http://<<HOST>>:8001'
```

### Test User KONG API is working

```bash
curl --location --request GET 'http://<<HOST>>:8000'
```

### Create Service

```bash
curl --location --request POST 'http:<<host>>:8001/services' \
--form 'name="microservice-apis"' \
--form 'url="<<URLOfAPIApp>>'
```

### Create Routes

```bash
curl --location --request POST 'http://<<HOST>>:8001/services/microservice-apis/routes' \
--form 'hosts[]="microservice-apis"'
```

### Test / Service

```bash
curl --location --request GET 'http://<<HOST>>:8000/' `
--header 'host: microservice-apis'
```

### Test /api1 service

```bash
curl --location --request GET 'http://<<HOST>>:8000/api1' \
--header 'host: microservice-apis'
```

### Test /api2 service

```bash
curl --location --request GET 'http://<<HOST>>:8000/api2' \
--header 'host: microservice-apis'
```

### Test /api3 service

```bash
curl --location --request GET 'http://<<HOST>>:8000/api3' \
--header 'host: microservice-apis'
```

### Enable Rate Limiting

```bash
curl --location --request POST 'http://<<HOST>>:8001/services/microservice-apis/plugins/' \
--form 'name="rate-limiting"' \
--form 'config.minute="5"'
```

The expected HTTP Response for the above HTTP Request after more than 5 requests in a minute is with HTTP Response `Status Code: 429 Too Many Requests` with message:-

```json
{
  "message":"API rate limit exceeded"
}
```

### Create Consumer

```bash
curl --location --request POST 'http://<<HOST>>:8001/consumers' \
--form 'username="random-user"'
```

### Use Key Authentication plugin of Kong API Gateway

#### Enable plugin for Key Authentication

```bash
curl --location --request POST 'http://<<HOST>>:8001/services/microservice-apis/plugins/' \
--form 'name="key-auth"'
```

#### Create API Key for Consumer

```bash
curl --location --request POST 'http://<<HOST>>:8001/consumers/random-user/key-auth/' \
--form 'key="qweasdzxc"'
```

#### Test an API without API Key

```bash
curl --location --request GET 'http://<<HOST>>:8000/api1' \
--header 'host: microservice-apis'
```

The expected HTTP Response for the above HTTP Request is with HTTP Response `Status Code: 401 Unauthorized` with message:-

```json
{
  "message":"No API Key found in request"
}
```

#### Test an API with incorrect API Key

```bash
curl --location --request GET 'http://<<HOST>>:8000/api1' \
--header 'host: microservice-apis' \
--header 'apikey: qweasdzxcfdsdaf'
```

The expected HTTP Response for the above HTTP Request is with HTTP Response `Status Code: 401 Unauthorized` with message:-

```json
{
  "message":"Invalid authentication credentials"
}
```

#### Test an API with correct API Key

```bash
curl --location --request GET 'http://<<HOST>>:8000/api1' \
--header 'host: microservice-apis' \
--header 'apikey: qweasdzxc'
```

### Use Basic Authentication plugin of Kong API Gateway

#### Enable plugin for Basic Authentication

```bash
curl --location --request POST 'http://<<HOST>>:8001/services/microservice-apis/plugins/' \
--form 'name="basic-auth"' \
--form 'config.hide_credentials="true"'
```

#### Create Credentials for a Consumer

```bash
curl --location --request POST 'http://<<HOST>>:8001/consumers/random-user/basic-auth/' \
--form 'username="agoodusername"' \
--form 'password="astrongpassword"'
```

#### Test an API with incorrect credentials

```bash
curl --location --request GET 'http://<<HOST>>:8000/api1' \
--header 'host: microservice-apis' \
--header 'Authorization: Basic YWdvb2R1c2VybmFtZTphc3Ryb25ncGFzc3dvcmRm'
```

The expected HTTP Response for the above HTTP Request is with HTTP Response `Status Code: 401 Unauthorized` with message:-

```json
{
  "message":"Invalid authentication credentials"
}
```

#### Test an API with correct credentials

```bash
curl --location --request GET 'http://<<HOST>>:8000/api1' \
--header 'host: microservice-apis' \
--header 'Authorization: Basic YWdvb2R1c2VybmFtZTphc3Ryb25ncGFzc3dvcmQ='
```

Note: The above commands use `\` as Line continuation character. Use `\` for OSX/Linux, `^` for Windows cmd and `` ` `` for Powershell.
