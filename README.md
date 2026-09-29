# Lime Boost Starter

An open-source Angular starter application with user authentication powered by Amazon Cognito.

Authentication is something almost every application needs, but building sign-up, sign-in, password recovery, session handling, and access control takes time.

Lime Boost Starter gives you a working starting point so you can spend more time building the functionality that makes your application unique.

## What is Lime Boost Starter?

Lime Boost Starter is an open-source Angular application that demonstrates how to use AWS services deployed and configured by Lime Boost.

The Starter provides the application code.

**Lime Boost deploys and configures the AWS infrastructure it needs.**

The AWS resources are deployed directly into your own AWS account, so you retain ownership and control of your infrastructure.

Lime Boost Starter is open source. Lime Boost itself is proprietary software.

## Features

The current Starter includes:

- User sign-up
- User sign-in
- Sign-out
- Email verification
- Password recovery
- Authentication state and session handling
- Protected Angular routes
- Amazon Cognito integration
- A foundation you can extend for your own application

## How it works

The application is an Angular single-page application that uses Amazon Cognito for authentication.

    User
      │
      ▼
    Angular application
      │
      ▼
    Amazon Cognito
      │
      ├── Sign up
      ├── Sign in
      ├── Email verification
      ├── Password recovery
      └── User sessions

Lime Boost creates and configures the required Cognito resources in your AWS account.

You then configure the Starter application with the values created by Lime Boost.

## Prerequisites

Before starting, you need:

- An AWS account
- A Lime Boost account
- Node.js
- npm
- Angular CLI

Install Angular CLI if you don't already have it:

    npm install -g @angular/cli

Check your Angular installation:

    ng version

## Getting Started

### 1. Clone Lime Boost Starter

Clone the repository:

    git clone <repository-url>

Move into the project:

    cd lime-boost-starter

Install the dependencies:

    npm install

### 2. Connect your AWS account to Lime Boost

Open Lime Boost:

https://app.limeboost.io

Connect your AWS account to Lime Boost.

This allows Lime Boost to deploy and configure AWS resources on your behalf.

The resources are created directly in your AWS account.

### 3. Deploy Amazon Cognito with Lime Boost

In Lime Boost, create the Amazon Cognito resources for your application.

Lime Boost deploys and configures the required resources, including:

- Cognito User Pool
- Cognito App Client
- Authentication configuration

After deployment, Lime Boost provides the values needed by the Starter application.

These include:

    AWS Region
    User Pool ID
    App Client ID

You can also view the created resources directly in the AWS Console.

### 4. Configure Lime Boost Starter

Configure the Angular application with the Cognito values created by Lime Boost.

For example:

    region: eu-north-1
    userPoolId: eu-north-1_xxxxxxxxx
    clientId: xxxxxxxxxxxxxxxxxxxxxxxxxx

Use the actual values from your Lime Boost deployment.

Do not put AWS access keys, secret access keys, or other AWS credentials in the Angular application.

### 5. Run the application

Start the Angular development server:

    ng serve

Open:

    http://localhost:4200

You can now test the authentication flow by creating a user and signing in.

## The complete flow

    AWS Account
        │
        ▼
    Lime Boost
        │
        │ deploys and configures
        ▼
    Amazon Cognito
        │
        ├── User Pool
        └── App Client
        │
        │ configuration
        ▼
    Lime Boost Starter
        │
        ▼
    Your application
        │
        ├── Sign up
        ├── Sign in
        ├── Password recovery
        └── Protected functionality

## Build for production

Create a production build of the Angular application:

    ng build

The generated files can be deployed as a static web application.

Lime Boost can deploy the frontend infrastructure to your AWS account using Amazon S3 and Amazon CloudFront.

    User
      │
      ▼
    CloudFront
      │
      ▼
    Angular application
      │
      ▼
    Amazon Cognito

This gives your application HTTPS delivery through CloudFront while Cognito handles user authentication.

## Using authentication with your own API

Amazon Cognito issues tokens after successful authentication.

These tokens can be used to authorize requests to your own APIs.

For example:

    Angular application
          │
          │ Authorization: Bearer <token>
          ▼
         API
          │
          ▼
    Protected resources

This makes Lime Boost Starter suitable as the foundation for a larger application.

You can extend it with your own:

- Backend APIs
- Databases
- Business functionality
- AI agents
- Other AWS services

## Security

Lime Boost Starter is a browser-based Angular application.

Never store AWS access keys, secret access keys, or other private AWS credentials in the application.

Do not use a Cognito App Client secret in a browser application. Anything included in the Angular application can be inspected by the user.

For a production application, review your authentication configuration, callback URLs, token handling, authorization rules, and AWS permissions before deployment.

## Build your application on top of Starter

Lime Boost Starter is designed to be modified.

Keep the authentication functionality and replace or extend the example functionality with your own application.

    Lime Boost Starter
          │
          ├── Authentication
          ├── User sessions
          └── Protected routes
                   │
                   ▼
            Your application
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
         APIs   Databases  AI Agents

Authentication is important, but it is rarely the reason you are building your product.

**Start with the functionality every application needs and spend your time building the functionality that makes your product valuable.**

## About Lime Boost

Lime Boost helps developers deploy production-ready AWS infrastructure without needing deep AWS expertise.

Instead of configuring individual AWS resources, you choose what you want to deploy and Lime Boost creates and configures the required infrastructure.

Everything is deployed directly into your own AWS account.

**You build the software. Lime Boost deploys the infrastructure. AWS runs it.**

Learn more:

https://limeboost.io

Try Lime Boost:

https://app.limeboost.io

## Contributing

Contributions, ideas, bug reports, and feedback are welcome.

If you find a problem or have an idea for improving Lime Boost Starter, open an issue or submit a pull request.

## License

Lime Boost Starter is open source.

See the `LICENSE` file for license details.

Lime Boost Starter is an open-source project. The Lime Boost platform itself is proprietary software.
