# 🏥 MediCare Pharmacy Management System

A premium, modern web application for pharmacy inventory valuation, retail sales billing, supplier relations, and automated compliance alerts. Built with a robust **Node.js/Express** backend, a responsive **React/Vite** frontend, and **MongoDB**.

---

## 🌟 Key Features

* **⚡ Interactive Sales Counter:** Fast retail billing workflow with smart, real-time medicine search autocomplete. Prevents transaction errors by automatically filtering out-of-stock items.
* **📈 Reports & Ledgers:** Standard-compliant ledger views for inventory valuation, sales records, low-stock reorder thresholds, and upcoming expiration warnings.
* **📥 Multi-Format Exports:** Export any data table (Medicines list, Reports valuation, and Sales ledgers) to standard `.csv` files with a single click.
* **✉️ Automated Gmail Alerts:** Scheduled daily email alerts sent directly to your Gmail containing HTML summaries and detailed CSV attachments of low-stock and expiring medicines. Also features an instant "Send Email Alert" trigger button on the UI for admins.
* **🛡️ Role-Based Access Controls:** Secure authentication with granular role routing (`admin`, `pharmacist`, `staff`). Restricts critical operations (e.g. deleting transactions, editing staff, or dispatching alerts) to Administrators.
* **🔍 Auto-complete Suggestions:** Real-time data auto-completion in the Add Medicine form using a preloaded suggestions dataset of 134 common Indian medicines, auto-filling category, generic name, dosage, and manufacturer fields.
* **🎨 Glassmorphic Premium UI:** Gorgeous dark mode login panels, glowing mesh gradients, custom toggle switches, and responsive design systems.

---

## 🛠️ Tech Stack

* **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide Icons, Axios, React Hot Toast.
* **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, Nodemailer, Nodemon, Helmet, Express Rate Limit.

---

## ⚙️ Setup and Configuration

### 1. Prerequisites
* [Node.js](https://nodejs.org/) installed (v18+ recommended).
* A running [MongoDB](https://www.mongodb.com/try/download/community) instance (local or Atlas cluster).

### 2. Environment Variables (`.env`)
Create a `.env` file inside the `backend` folder and add the following keys:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-auth-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret
JWT_EXPIRE=30m
JWT_REFRESH_EXPIRE=7d

# ✉️ Gmail SMTP Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-sending-email@gmail.com
SMTP_PASS=your-16-character-app-password
ALERT_RECIPIENT=your-receiving-email@gmail.com
```

> [!IMPORTANT]
> **Gmail App Password Setup:**
> Due to Google security policies, your standard Google password will not work for SMTP. You must generate an App Password:
> 1. Go to your **Google Account settings** -> **Security**.
> 2. Enable **2-Step Verification** if it isn't already.
> 3. Go to the **App passwords** section at the bottom.
> 4. Select/name the app (e.g., `MediCare Pharmacy`) and click **Create**.
> 5. Copy the **16-letter App Password** and paste it as `SMTP_PASS` in your `.env` file.

---

## 🚀 Running the Project

### Setup Backend:
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. *(Optional)* Seed the database with demo admin/pharmacist credentials and initial suppliers:
   ```bash
   npm run seed
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   *The backend will boot on `http://localhost:5000/` and run its first automated email alert check 10 seconds later.*

### Setup Frontend:
1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   *The frontend will boot on `http://localhost:5173/` (or `5174` if `5173` is busy).*

---

## 📂 Project Structure

```text
├── backend/
│   ├── config/            # DB and connection configurations
│   ├── controllers/       # Route request handlers
│   ├── middleware/        # Authentication & Role validation
│   ├── models/            # Mongoose schemas (User, Medicine, Sale, Purchase, etc.)
│   ├── routes/            # Express API endpoint routers
│   ├── seed/              # DB seeders and suggestions lists
│   ├── utils/             # SMTP Mailer & utility helpers (emailUtils.js)
│   ├── index.js           # Express main server & daily job scheduler
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable components (common modal, confirm dialogs, layouts)
│   │   ├── context/       # Auth context providers
│   │   ├── pages/         # Page components (Dashboard, Medicines, Sales, Reports, etc.)
│   │   ├── services/      # Axios API service routes
│   │   ├── App.jsx        # Route definitions
│   │   └── main.jsx
│   └── package.json
└── README.md
```
