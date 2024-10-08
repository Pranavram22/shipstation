# [ShipStation](https://shipstation.ai)

ShipStation, https://shipstation.ai is an AI based code generation platform.
Currently, it is optimised for generating simple landing pages, portfolios, email templates, etc. with more complex features to follow.

## Features of ShipStation

- User authentication (login/signup) via SupaBase
- Dashboard to generate new projects
- View previously generated projects with code editor to edit the generated website
- Option to use personal Anthropic API key for free usage
- Integrated payment options via PayPal and Razorpay for purchasing credits.
- Real-time progress tracking during website generation on websocket

## Project Architecture

The project is a full stack application
1. Server-side (Node.js) - located in the `server` folder.
2. Client-side (React with Vite) - located in the `client` folder.

## Prerequisites

- Node.js (v20 or later recommended)
- npm or yarn
- Anthropic API key 
- Supabase account (for auth and more)
- Tavily API key
- Paypal account (for payment integration) or can use Razorpay or skip it all together

## Setup Instructions
Clone the repository and follow the instructions below:
```bash
git clone https://github.com/daytimedrinkingclub/shipstation.git
```

### Supabase setup
1. Create a new project in Supabase
2. Copy SQL from the server/setup.sql file and run it in the SQL editor
https://supabase.com/dashboard/project/[your-project-id]/sql/new

### Environment Variables

Ensure all environment variables are properly set in both `.env` files. Refer to the `.env.template` files for the required variables.

There are three env files that need to be created:

1. Backend .env from .env.template in root folder.
2. Frontend .env.local from .env.template in client directory
3. Frontend .env.production from .env.template in client directory. This will be used while creating production build

### Server Setup
1. Install server dependencies:
```bash
npm install
```
2. Setup environments: Copy `.env.template` to `.env` and fill in the required environment variables. Read the comments in the template file for more details.
3. Start the backend server from the repo directory
```bash
npm run dev
```
4. **In a new terminal**, navigate to the client directory and install the frontend dependencies
```bash
cd client
npm install
```
5. Start the frontend dev server from the client directory
```bash
npm run dev
```
6. Build the client if needed for deployment
```bash
cd client
npm run build
```

## Usage

1. Access the application through the browser (default: `http://localhost:5173`)
2. Sign up or log in to your account
3. Choose between creating a landing page or portfolio
4. Add the details for getting a website as output.

The websites are stored in s3 bucket and served on the path
https://shipstation.ai/site/website-slug

# Deploying to Heroku
1. Build the client project
```bash
cd client
npm run build
```
2. Commit the changes
3. Push to the main branch
4. Heroku will automatically detect the changes and deploy the app

## Next moves

Since you came here looking for it, it was also waiting for you to contribute to the project.
As for the next rabbithole, visit https://freeaifinder.com
We all are limited by the desire to learn things and energy to validate. Thankfully, we are making it easier for you.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Do good, be good.
