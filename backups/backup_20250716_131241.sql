--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.9 (Ubuntu 16.9-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: prevent_closed_bulletin_modification(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_closed_bulletin_modification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
    RAISE EXCEPTION 'Deletion of closed closure bulletin is forbidden for legal compliance';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.prevent_closed_bulletin_modification() OWNER TO postgres;

--
-- Name: prevent_legal_journal_modification(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_legal_journal_modification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
    RAISE EXCEPTION 'Modification of legal journal is forbidden for legal compliance (Article 286-I-3 bis du CGI)';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.prevent_legal_journal_modification() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: archive_exports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.archive_exports (
    id integer NOT NULL,
    export_type character varying(20) NOT NULL,
    period_start timestamp without time zone,
    period_end timestamp without time zone,
    file_path character varying(500) NOT NULL,
    file_hash character varying(64) NOT NULL,
    file_size bigint NOT NULL,
    format character varying(20) NOT NULL,
    digital_signature text,
    export_status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    verified_at timestamp without time zone,
    CONSTRAINT archive_exports_export_status_check CHECK (((export_status)::text = ANY (ARRAY[('PENDING'::character varying)::text, ('COMPLETED'::character varying)::text, ('FAILED'::character varying)::text, ('VERIFIED'::character varying)::text]))),
    CONSTRAINT archive_exports_export_type_check CHECK (((export_type)::text = ANY (ARRAY[('DAILY'::character varying)::text, ('MONTHLY'::character varying)::text, ('ANNUAL'::character varying)::text, ('FULL'::character varying)::text]))),
    CONSTRAINT archive_exports_format_check CHECK (((format)::text = ANY (ARRAY[('CSV'::character varying)::text, ('XML'::character varying)::text, ('PDF'::character varying)::text, ('JSON'::character varying)::text]))),
    CONSTRAINT file_size_positive CHECK ((file_size > 0)),
    CONSTRAINT period_valid_archive CHECK (((period_end IS NULL) OR (period_start IS NULL) OR (period_end >= period_start)))
);


ALTER TABLE public.archive_exports OWNER TO postgres;

--
-- Name: archive_exports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.archive_exports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.archive_exports_id_seq OWNER TO postgres;

--
-- Name: archive_exports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.archive_exports_id_seq OWNED BY public.archive_exports.id;


--
-- Name: audit_trail; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_trail (
    id integer NOT NULL,
    user_id character varying(100),
    action_type character varying(50) NOT NULL,
    resource_type character varying(50),
    resource_id character varying(100),
    action_details jsonb,
    ip_address inet,
    user_agent text,
    session_id character varying(100),
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_trail OWNER TO postgres;

--
-- Name: audit_trail_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_trail_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_trail_id_seq OWNER TO postgres;

--
-- Name: audit_trail_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_trail_id_seq OWNED BY public.audit_trail.id;


--
-- Name: business_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_settings (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    address text NOT NULL,
    phone character varying(30) NOT NULL,
    email character varying(100) NOT NULL,
    siret character varying(20) NOT NULL,
    tax_identification character varying(30) NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.business_settings OWNER TO postgres;

--
-- Name: business_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.business_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.business_settings_id_seq OWNER TO postgres;

--
-- Name: business_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_settings_id_seq OWNED BY public.business_settings.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    default_tax_rate numeric(5,2) DEFAULT 20.00,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: closure_bulletins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.closure_bulletins (
    id integer NOT NULL,
    closure_type character varying(10) NOT NULL,
    period_start timestamp without time zone NOT NULL,
    period_end timestamp without time zone NOT NULL,
    total_transactions integer DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_vat numeric(12,2) DEFAULT 0 NOT NULL,
    vat_breakdown jsonb NOT NULL,
    payment_methods_breakdown jsonb NOT NULL,
    first_sequence integer,
    last_sequence integer,
    closure_hash character varying(64) NOT NULL,
    is_closed boolean DEFAULT false NOT NULL,
    closed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tips_total numeric DEFAULT 0,
    change_total numeric DEFAULT 0,
    CONSTRAINT closure_bulletins_closure_type_check CHECK (((closure_type)::text = ANY ((ARRAY['DAILY'::character varying, 'WEEKLY'::character varying, 'MONTHLY'::character varying, 'ANNUAL'::character varying])::text[]))),
    CONSTRAINT period_valid CHECK ((period_end >= period_start)),
    CONSTRAINT sequence_order CHECK (((last_sequence IS NULL) OR (first_sequence IS NULL) OR (last_sequence >= first_sequence))),
    CONSTRAINT totals_positive CHECK (((total_transactions >= 0) AND (total_amount >= (0)::numeric) AND (total_vat >= (0)::numeric)))
);


ALTER TABLE public.closure_bulletins OWNER TO postgres;

--
-- Name: closure_bulletins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.closure_bulletins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.closure_bulletins_id_seq OWNER TO postgres;

--
-- Name: closure_bulletins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.closure_bulletins_id_seq OWNED BY public.closure_bulletins.id;


--
-- Name: closure_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.closure_settings (
    id integer NOT NULL,
    setting_key character varying(50) NOT NULL,
    setting_value text NOT NULL,
    description text,
    updated_by character varying(100),
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.closure_settings OWNER TO postgres;

--
-- Name: closure_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.closure_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.closure_settings_id_seq OWNER TO postgres;

--
-- Name: closure_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.closure_settings_id_seq OWNED BY public.closure_settings.id;


--
-- Name: legal_journal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.legal_journal (
    id integer NOT NULL,
    sequence_number integer NOT NULL,
    transaction_type character varying(20) NOT NULL,
    order_id integer,
    amount numeric(10,2) NOT NULL,
    vat_amount numeric(10,2) NOT NULL,
    payment_method character varying(50) NOT NULL,
    transaction_data jsonb NOT NULL,
    previous_hash character varying(64) NOT NULL,
    current_hash character varying(64) NOT NULL,
    "timestamp" timestamp without time zone NOT NULL,
    user_id character varying(100),
    register_id character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT amount_positive CHECK ((amount >= (0)::numeric)),
    CONSTRAINT legal_journal_transaction_type_check CHECK (((transaction_type)::text = ANY (ARRAY[('SALE'::character varying)::text, ('REFUND'::character varying)::text, ('CORRECTION'::character varying)::text, ('CLOSURE'::character varying)::text, ('ARCHIVE'::character varying)::text]))),
    CONSTRAINT sequence_positive CHECK ((sequence_number > 0)),
    CONSTRAINT vat_amount_positive CHECK ((vat_amount >= (0)::numeric))
);


ALTER TABLE public.legal_journal OWNER TO postgres;

--
-- Name: legal_journal_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.legal_journal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.legal_journal_id_seq OWNER TO postgres;

--
-- Name: legal_journal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.legal_journal_id_seq OWNED BY public.legal_journal.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer,
    product_id integer,
    product_name character varying(100) NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    tax_rate numeric(5,2) NOT NULL,
    tax_amount numeric(10,2) NOT NULL,
    happy_hour_applied boolean DEFAULT false,
    happy_hour_discount_amount numeric(10,2) DEFAULT 0,
    sub_bill_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    total_tax numeric(10,2) NOT NULL,
    payment_method character varying(20) DEFAULT 'cash'::character varying,
    status character varying(20) DEFAULT 'completed'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tips numeric DEFAULT 0,
    change numeric DEFAULT 0
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id integer NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permissions_id_seq OWNER TO postgres;

--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    price numeric(10,2) NOT NULL,
    tax_rate numeric(5,2) DEFAULT 20.00,
    category_id integer,
    happy_hour_discount_percent numeric(5,2) DEFAULT NULL::numeric,
    happy_hour_discount_fixed numeric(10,2) DEFAULT NULL::numeric,
    is_happy_hour_eligible boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: sub_bills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sub_bills (
    id integer NOT NULL,
    order_id integer,
    payment_method character varying(20) NOT NULL,
    amount numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sub_bills OWNER TO postgres;

--
-- Name: sub_bills_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sub_bills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sub_bills_id_seq OWNER TO postgres;

--
-- Name: sub_bills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sub_bills_id_seq OWNED BY public.sub_bills.id;


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_permissions (
    user_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.user_permissions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(200) NOT NULL,
    is_admin boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: archive_exports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.archive_exports ALTER COLUMN id SET DEFAULT nextval('public.archive_exports_id_seq'::regclass);


--
-- Name: audit_trail id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_trail ALTER COLUMN id SET DEFAULT nextval('public.audit_trail_id_seq'::regclass);


--
-- Name: business_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_settings ALTER COLUMN id SET DEFAULT nextval('public.business_settings_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: closure_bulletins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.closure_bulletins ALTER COLUMN id SET DEFAULT nextval('public.closure_bulletins_id_seq'::regclass);


--
-- Name: closure_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.closure_settings ALTER COLUMN id SET DEFAULT nextval('public.closure_settings_id_seq'::regclass);


--
-- Name: legal_journal id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_journal ALTER COLUMN id SET DEFAULT nextval('public.legal_journal_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: sub_bills id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_bills ALTER COLUMN id SET DEFAULT nextval('public.sub_bills_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: archive_exports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.archive_exports (id, export_type, period_start, period_end, file_path, file_hash, file_size, format, digital_signature, export_status, created_by, created_at, verified_at) FROM stdin;
\.


--
-- Data for Name: audit_trail; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_trail (id, user_id, action_type, resource_type, resource_id, action_details, ip_address, user_agent, session_id, "timestamp") FROM stdin;
1	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:14:49.31139
2	\N	CREATE_ORDER	ORDER	1	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Triple", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}], "notes": "Paiement par carte: 6.50€", "status": "completed", "total_tax": 1.0833333333333335, "total_amount": 6.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:15:08.35344
3	\N	CREATE_ORDER	ORDER	2	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 41, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Blanche", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}, {"quantity": 1, "tax_rate": 20, "product_id": 42, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Spritz Sureau", "happy_hour_applied": true, "happy_hour_discount_amount": 1.75}], "notes": "Paiement par carte: 13.50€", "status": "completed", "total_tax": 2.25, "total_amount": 13.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:15:21.801099
4	1	CREATE_CATEGORY	CATEGORY	29	{"name": "Mocktails", "default_tax_rate": 20}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:16:09.877838
5	\N	AUTH_FAILED	\N	\N	{"reason": "Missing token"}	::1	curl/8.5.0	\N	2025-07-05 17:17:39.593906
6	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:19:36.172794
7	1	CREATE_PRODUCT	PRODUCT	43	{"name": "Dry Quiri", "price": 5.5, "tax_rate": 10, "category_id": 29, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:20:07.117949
8	1	CREATE_CATEGORY	CATEGORY	30	{"name": "Softs", "default_tax_rate": 20}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:20:23.8946
9	1	CREATE_PRODUCT	PRODUCT	44	{"name": "Bissap", "price": 5.5, "tax_rate": 10, "category_id": 30, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:21:01.066796
10	1	CREATE_PRODUCT	PRODUCT	45	{"name": "Ginger", "price": 5.5, "tax_rate": 10, "category_id": 30, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:21:50.784702
11	\N	CREATE_ORDER	ORDER	3	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 44, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Bissap", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}, {"quantity": 1, "tax_rate": 10, "product_id": 43, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Dry Quiri", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}], "notes": "Paiement par carte: 9.00€", "status": "completed", "total_tax": 0.8181818181818181, "total_amount": 9, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:22:25.868538
12	\N	CREATE_ORDER	ORDER	4	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "IPA", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}, {"quantity": 1, "tax_rate": 10, "product_id": 45, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Ginger", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}], "notes": "Paiement par carte: 11.00€", "status": "completed", "total_tax": 1.4924242424242427, "total_amount": 11, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:23:06.018995
13	1	CREATE_PRODUCT	PRODUCT	46	{"name": "Blonde de Soif", "price": 7.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:33:48.526636
14	1	CREATE_PRODUCT	PRODUCT	47	{"name": "Blonde de Soif", "price": 3.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:34:10.760012
15	1	UPDATE_PRODUCT	PRODUCT	46	{"name": "Blonde de Soif", "price": 6, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:34:23.607367
16	1	UPDATE_PRODUCT	PRODUCT	47	{"name": "Blonde de Soif", "price": 3.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:34:31.222796
17	1	CREATE_PRODUCT	PRODUCT	48	{"name": "Blanche", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:34:49.120512
144	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:24:31.069307
18	1	CREATE_PRODUCT	PRODUCT	49	{"name": "IPA", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:35:09.712484
19	1	CREATE_PRODUCT	PRODUCT	50	{"name": "Romarin", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:35:28.689408
20	1	CREATE_PRODUCT	PRODUCT	51	{"name": "Triple", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:35:55.95263
21	1	CREATE_PRODUCT	PRODUCT	52	{"name": "NEIPA", "price": 7.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:36:26.867018
22	1	CREATE_PRODUCT	PRODUCT	53	{"name": "NEIPA", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:36:43.572511
23	1	CREATE_PRODUCT	PRODUCT	54	{"name": "Rouge", "price": 7.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:37:16.946921
24	1	CREATE_PRODUCT	PRODUCT	55	{"name": "Rouge", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:37:32.061908
25	1	CREATE_PRODUCT	PRODUCT	56	{"name": "Bière du Moment", "price": 7.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:38:29.3778
26	1	CREATE_PRODUCT	PRODUCT	57	{"name": "Bière du Moment", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:39:15.224349
27	1	CREATE_PRODUCT	PRODUCT	58	{"name": "Picon", "price": 7, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:40:09.692319
28	1	CREATE_PRODUCT	PRODUCT	59	{"name": "Picon", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:40:32.927552
29	1	UPDATE_PRODUCT	PRODUCT	58	{"name": "Picon", "price": 7, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:40:46.634583
30	1	CREATE_PRODUCT	PRODUCT	60	{"name": "Coca", "price": 4, "tax_rate": 10, "category_id": 30, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:41:27.79988
31	\N	CREATE_ORDER	ORDER	5	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 47, "tax_amount": 0.5833333333333334, "unit_price": 3.5, "total_price": 3.5, "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 60, "tax_amount": 0.27272727272727276, "unit_price": 3, "total_price": 3, "product_name": "Coca", "happy_hour_applied": true, "happy_hour_discount_amount": 0.75}], "notes": "Paiement par carte: 6.50€", "status": "completed", "total_tax": 0.8560606060606062, "total_amount": 6.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:41:47.210515
32	1	CREATE_PRODUCT	PRODUCT	61	{"name": "Spritz Apérol", "price": 7, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:42:11.503069
33	1	CREATE_PRODUCT	PRODUCT	62	{"name": "Spritz Campari", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:42:29.512415
34	1	CREATE_PRODUCT	PRODUCT	63	{"name": "Spritz Limoncello", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:43:15.203774
35	1	CREATE_PRODUCT	PRODUCT	64	{"name": "Amaretto Stormy", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:43:55.612941
145	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:24:31.07271
36	1	CREATE_PRODUCT	PRODUCT	65	{"name": "Cocktail du moment", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:44:14.237124
37	1	CREATE_PRODUCT	PRODUCT	66	{"name": "Caïpi", "price": 7, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:44:55.006327
38	1	CREATE_PRODUCT	PRODUCT	67	{"name": "Caïpi liqueur", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:45:13.356111
39	1	CREATE_PRODUCT	PRODUCT	68	{"name": "Espresso Martini", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:45:37.900233
40	1	CREATE_PRODUCT	PRODUCT	69	{"name": "Gin To", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:45:53.495951
41	1	CREATE_PRODUCT	PRODUCT	70	{"name": "Gin To liqueur", "price": 9, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:46:11.007328
42	1	CREATE_PRODUCT	PRODUCT	71	{"name": "Bramble Star", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:48:10.034676
43	1	CREATE_PRODUCT	PRODUCT	72	{"name": "Moscow Mule", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:48:43.540927
44	1	CREATE_PRODUCT	PRODUCT	73	{"name": "Jus de Pomme Pétillant", "price": 5.5, "tax_rate": 10, "category_id": 30, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:50:21.551604
45	1	CREATE_PRODUCT	PRODUCT	74	{"name": "London Mule", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:50:53.936462
46	1	CREATE_PRODUCT	PRODUCT	75	{"name": "Jamaïcan Mule", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:52:19.143849
47	1	CREATE_PRODUCT	PRODUCT	76	{"name": "Citronnade", "price": 5.5, "tax_rate": 10, "category_id": 29, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:52:45.91549
48	1	CREATE_PRODUCT	PRODUCT	77	{"name": "Sirop", "price": 2, "tax_rate": 10, "category_id": 30, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:53:17.436342
49	\N	CREATE_ORDER	ORDER	6	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 77, "tax_amount": 0.18181818181818182, "unit_price": 2, "total_price": 2, "product_name": "Sirop", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 51, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 76, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Citronnade", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}], "notes": "Paiement par carte: 11.00€", "status": "completed", "total_tax": 1.3409090909090908, "total_amount": 11, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:53:54.677208
50	\N	CREATE_ORDER	ORDER	7	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "IPA", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}, {"quantity": 1, "tax_rate": 20, "product_id": 46, "tax_amount": 0.8333333333333334, "unit_price": 5, "total_price": 5, "product_name": "Blonde de Soif", "happy_hour_applied": true, "happy_hour_discount_amount": 1.25}], "notes": "Paiement par carte: 11.50€", "status": "completed", "total_tax": 1.916666666666667, "total_amount": 11.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:55:33.903457
51	1	CREATE_PRODUCT	PRODUCT	78	{"name": "Whiskey Coca", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:56:27.454492
146	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:25:01.540962
52	1	CREATE_PRODUCT	PRODUCT	79	{"name": "Whiskey Coca double", "price": 10, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:56:54.602683
53	1	CREATE_PRODUCT	PRODUCT	80	{"name": "Cuba Libre", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:57:12.050409
54	1	CREATE_CATEGORY	CATEGORY	31	{"name": "Vins", "default_tax_rate": 20}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:57:44.951094
55	1	CREATE_PRODUCT	PRODUCT	81	{"name": "CDR", "price": 6.5, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:58:00.460152
56	1	CREATE_PRODUCT	PRODUCT	82	{"name": "CDR", "price": 25, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:58:19.973107
57	1	CREATE_PRODUCT	PRODUCT	83	{"name": "Blaye", "price": 6.5, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:58:56.964014
58	1	CREATE_PRODUCT	PRODUCT	84	{"name": "Blaye", "price": 25, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:59:17.28749
59	1	CREATE_PRODUCT	PRODUCT	85	{"name": "Chardo", "price": 5.5, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:59:35.074393
60	1	CREATE_PRODUCT	PRODUCT	86	{"name": "Chardo", "price": 23, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:00:03.602693
61	1	CREATE_PRODUCT	PRODUCT	87	{"name": "Uby 3", "price": 6.5, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:00:28.620851
62	1	CREATE_PRODUCT	PRODUCT	88	{"name": "Uby 3", "price": 25, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:00:48.117083
63	1	CREATE_PRODUCT	PRODUCT	89	{"name": "Uby 4", "price": 6.5, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:01:12.87817
64	1	CREATE_PRODUCT	PRODUCT	90	{"name": "Uby 4", "price": 25, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:01:40.452299
65	1	CREATE_CATEGORY	CATEGORY	32	{"name": "Apéritifs", "default_tax_rate": 20}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:02:20.307261
66	1	CREATE_PRODUCT	PRODUCT	91	{"name": "Negroni", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:02:44.579103
67	1	CREATE_PRODUCT	PRODUCT	92	{"name": "Proscecco", "price": 5.5, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:03:21.603413
68	1	CREATE_PRODUCT	PRODUCT	93	{"name": "Pastis", "price": 4, "tax_rate": 20, "category_id": 32, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:03:36.696769
69	1	CREATE_PRODUCT	PRODUCT	94	{"name": "Bellini", "price": 6.5, "tax_rate": 20, "category_id": 32, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:04:24.692204
70	1	CREATE_PRODUCT	PRODUCT	95	{"name": "Amricano", "price": 6.5, "tax_rate": 20, "category_id": 32, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:04:37.534784
71	1	CREATE_PRODUCT	PRODUCT	96	{"name": "Menthe Pastille/Get", "price": 6.5, "tax_rate": 20, "category_id": 32, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:04:55.83818
150	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 14:18:33.384256
72	1	CREATE_PRODUCT	PRODUCT	97	{"name": "Baileys", "price": 6.5, "tax_rate": 20, "category_id": 32, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:05:11.839874
73	1	UPDATE_PRODUCT	PRODUCT	95	{"name": "Americano", "price": 6.5, "tax_rate": 20, "category_id": 32, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:05:39.519023
74	1	CREATE_PRODUCT	PRODUCT	98	{"name": "Café", "price": 2, "tax_rate": 10, "category_id": 30, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:05:59.801078
75	1	CREATE_PRODUCT	PRODUCT	99	{"name": "Jus de Fruit", "price": 4, "tax_rate": 10, "category_id": 30, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:06:24.51923
76	1	CREATE_PRODUCT	PRODUCT	100	{"name": "IPA Sans Alcool", "price": 5.5, "tax_rate": 10, "category_id": 30, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:08:25.59128
77	1	CREATE_PRODUCT	PRODUCT	101	{"name": "Bière Sirop", "price": 7, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:09:36.733224
78	1	UPDATE_PRODUCT	PRODUCT	101	{"name": "Bière Sirop", "price": 7, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:09:55.529631
79	1	CREATE_PRODUCT	PRODUCT	102	{"name": "Bière Sirop", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:10:39.535478
80	1	CREATE_CATEGORY	CATEGORY	33	{"name": "A Manger", "default_tax_rate": 20}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:11:13.948092
81	1	CREATE_PRODUCT	PRODUCT	103	{"name": "Planche", "price": 21, "tax_rate": 10, "category_id": 33, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:11:28.609683
82	1	CREATE_PRODUCT	PRODUCT	104	{"name": "Focaccia ", "price": 8, "tax_rate": 10, "category_id": 33, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:11:47.667498
83	1	CREATE_PRODUCT	PRODUCT	105	{"name": "Saucisson", "price": 6.5, "tax_rate": 10, "category_id": 33, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:12:06.354794
84	1	ARCHIVE_PRODUCT	PRODUCT	41	{"reason": "Product used in orders", "product_id": 41, "deletion_type": "soft_delete"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:13:43.937313
85	\N	CREATE_ORDER	ORDER	8	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 76, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Citronnade", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}, {"quantity": 1, "tax_rate": 10, "product_id": 44, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Bissap", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}], "notes": "Paiement: 9.00€, Rendu: 0.00€", "status": "completed", "total_tax": 0.8181818181818181, "total_amount": 9, "payment_method": "cash"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:30:42.541341
86	\N	CREATE_ORDER	ORDER	9	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 47, "tax_amount": 0.5833333333333334, "unit_price": 3.5, "total_price": 3.5, "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 3.50€", "status": "completed", "total_tax": 0.5833333333333334, "total_amount": 3.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:36:03.625555
87	\N	CREATE_ORDER	ORDER	10	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 44, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Bissap", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}, {"quantity": 1, "tax_rate": 10, "product_id": 73, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Jus de Pomme Pétillant", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}, {"quantity": 1, "tax_rate": 10, "product_id": 76, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Citronnade", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}, {"quantity": 1, "tax_rate": 10, "product_id": 44, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Bissap", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}, {"quantity": 1, "tax_rate": 20, "product_id": 66, "tax_amount": 1.0000000000000002, "unit_price": 6, "total_price": 6, "product_name": "Caïpi", "happy_hour_applied": true, "happy_hour_discount_amount": 1.5}, {"quantity": 1, "tax_rate": 20, "product_id": 66, "tax_amount": 1.0000000000000002, "unit_price": 6, "total_price": 6, "product_name": "Caïpi", "happy_hour_applied": true, "happy_hour_discount_amount": 1.5}, {"quantity": 1, "tax_rate": 20, "product_id": 65, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Cocktail du moment", "happy_hour_applied": true, "happy_hour_discount_amount": 1.75}], "notes": "Paiement par carte: 37.00€", "status": "completed", "total_tax": 4.803030303030304, "total_amount": 37, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:45:06.424397
103	\N	CREATE_ORDER	ORDER	26	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 53, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "NEIPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 4.50€", "status": "completed", "total_tax": 0.75, "total_amount": 4.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:07:55.46588
88	\N	CREATE_ORDER	ORDER	11	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "IPA", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}, {"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "IPA", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}, {"quantity": 1, "tax_rate": 20, "product_id": 46, "tax_amount": 0.8333333333333334, "unit_price": 5, "total_price": 5, "product_name": "Blonde de Soif", "happy_hour_applied": true, "happy_hour_discount_amount": 1.25}], "notes": "Split par items - 3 parts: Part 1: Espèces 6.50€, Part 2: Carte 5.00€, Part 3: Carte 6.50€", "status": "completed", "total_tax": 3.0000000000000004, "total_amount": 18, "payment_method": "split"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:49:00.08334
89	\N	CREATE_ORDER	ORDER	12	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Triple", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}], "notes": "Paiement par carte: 6.50€", "status": "completed", "total_tax": 1.0833333333333335, "total_amount": 6.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:57:28.10791
90	\N	CREATE_ORDER	ORDER	13	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 105, "tax_amount": 0.5909090909090908, "unit_price": 6.5, "total_price": 6.5, "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 65, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Cocktail du moment", "happy_hour_applied": true, "happy_hour_discount_amount": 1.75}, {"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Triple", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}], "notes": "Paiement par carte: 20.00€", "status": "completed", "total_tax": 2.840909090909091, "total_amount": 20, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:59:51.539532
91	\N	CREATE_ORDER	ORDER	14	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 52, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "NEIPA", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}, {"quantity": 1, "tax_rate": 20, "product_id": 52, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "NEIPA", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}], "notes": "Paiement par carte: 13.00€", "status": "completed", "total_tax": 2.166666666666667, "total_amount": 13, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:00:13.950222
92	\N	CREATE_ORDER	ORDER	15	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 53, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "NEIPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 47, "tax_amount": 0.5833333333333334, "unit_price": 3.5, "total_price": 3.5, "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 68, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Espresso Martini", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 85, "tax_amount": 0.9166666666666667, "unit_price": 5.5, "total_price": 5.5, "product_name": "Chardo", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 42.50€", "status": "completed", "total_tax": 5.492424242424243, "total_amount": 42.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:08:33.399976
93	\N	CREATE_ORDER	ORDER	16	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 43, "tax_amount": 0.5, "unit_price": 5.5, "total_price": 5.5, "product_name": "Dry Quiri", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 57, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 25.00€", "status": "completed", "total_tax": 3.75, "total_amount": 25, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:20:46.107731
94	\N	CREATE_ORDER	ORDER	17	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 104, "tax_amount": 0.7272727272727273, "unit_price": 8, "total_price": 8, "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 8.00€", "status": "completed", "total_tax": 0.7272727272727273, "total_amount": 8, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:21:05.238114
154	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 09:46:39.064266
95	\N	CREATE_ORDER	ORDER	18	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 61, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Spritz Apérol", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 3 parts: Part 1: Carte 7.50€, Part 2: Carte 7.00€, Part 3: Carte 7.50€", "status": "completed", "total_tax": 3.666666666666667, "total_amount": 22, "payment_method": "split"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:23:12.081462
96	\N	CREATE_ORDER	ORDER	19	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 15.00€", "status": "completed", "total_tax": 2.5, "total_amount": 15, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:37:57.28665
97	\N	CREATE_ORDER	ORDER	20	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 64, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 74, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "London Mule", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 16.00€", "status": "completed", "total_tax": 2.666666666666667, "total_amount": 16, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:41:26.188481
98	\N	CREATE_ORDER	ORDER	21	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 66, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Caïpi", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 64, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 15.00€", "status": "completed", "total_tax": 2.5, "total_amount": 15, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:48:01.092872
99	\N	CREATE_ORDER	ORDER	22	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 56, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 56, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 15.00€", "status": "completed", "total_tax": 2.5, "total_amount": 15, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:51:10.495807
100	\N	CREATE_ORDER	ORDER	23	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 104, "tax_amount": 0.7272727272727273, "unit_price": 8, "total_price": 8, "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 95, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Americano", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 22.00€", "status": "completed", "total_tax": 3.0606060606060606, "total_amount": 22, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:58:32.659315
101	\N	CREATE_ORDER	ORDER	24	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 49, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 4.50€", "status": "completed", "total_tax": 0.75, "total_amount": 4.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:01:48.589186
102	\N	CREATE_ORDER	ORDER	25	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 56, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Carte 7.50€, Part 2: Espèces 7.50€", "status": "completed", "total_tax": 2.5, "total_amount": 15, "payment_method": "split"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:07:17.563824
147	1	SET_PERMISSIONS	USER	1	{"permissions": ["access_pos", "access_menu", "access_happy_hour", "access_history", "access_settings", "access_compliance"]}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:25:14.469841
104	\N	CREATE_ORDER	ORDER	27	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 7.50€", "status": "completed", "total_tax": 1.25, "total_amount": 7.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:09:52.588378
105	\N	CREATE_ORDER	ORDER	28	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 52, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "NEIPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 85, "tax_amount": 0.9166666666666667, "unit_price": 5.5, "total_price": 5.5, "product_name": "Chardo", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 13.00€", "status": "completed", "total_tax": 2.166666666666667, "total_amount": 13, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:24:33.979165
106	\N	CREATE_ORDER	ORDER	29	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 61, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Spritz Apérol", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 14.50€", "status": "completed", "total_tax": 2.416666666666667, "total_amount": 14.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:28:08.272327
107	\N	CREATE_ORDER	ORDER	30	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 95, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Americano", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 14.00€", "status": "completed", "total_tax": 2.3333333333333335, "total_amount": 14, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:28:40.62099
108	\N	CREATE_ORDER	ORDER	31	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement: 15.00€, Rendu: 0.00€", "status": "completed", "total_tax": 2.5, "total_amount": 15, "payment_method": "cash"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:31:15.381835
109	\N	CREATE_ORDER	ORDER	32	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 50, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 55, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Rouge", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 9.00€", "status": "completed", "total_tax": 1.5, "total_amount": 9, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:31:26.267722
110	\N	CREATE_ORDER	ORDER	33	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 7.50€", "status": "completed", "total_tax": 1.25, "total_amount": 7.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:34:06.54912
111	\N	CREATE_ORDER	ORDER	34	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 87, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Uby 3", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 6.50€", "status": "completed", "total_tax": 1.0833333333333335, "total_amount": 6.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:35:14.044825
120	\N	CREATE_ORDER	ORDER	41	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 51, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 4.50€", "status": "completed", "total_tax": 0.75, "total_amount": 4.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 21:32:05.680083
148	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:32:56.573942
151	1	ARCHIVE_CATEGORY	CATEGORY	33	{"reason": "Category contains products that were used in orders (legal preservation required)", "category_id": 33, "deletion_type": "soft"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 14:19:35.294422
155	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 10:12:55.84996
166	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 15:44:02.498667
112	\N	CREATE_ORDER	ORDER	35	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 47, "tax_amount": 0.5833333333333334, "unit_price": 3.5, "total_price": 3.5, "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 54.50€", "status": "completed", "total_tax": 7.492424242424242, "total_amount": 54.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:36:59.767965
113	1	CREATE_PRODUCT	PRODUCT	106	{"name": "Blanche", "price": 7.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:37:33.965802
114	1	CREATE_PRODUCT	PRODUCT	107	{"name": "Ti Punch", "price": 7, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:50:48.557951
115	\N	CREATE_ORDER	ORDER	36	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 107, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Ti Punch", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 14.50€", "status": "completed", "total_tax": 2.416666666666667, "total_amount": 14.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:51:24.189282
116	\N	CREATE_ORDER	ORDER	37	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 106, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Blanche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 7.50€", "status": "completed", "total_tax": 1.25, "total_amount": 7.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 21:07:16.569619
117	\N	CREATE_ORDER	ORDER	38	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 106, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Blanche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 73, "tax_amount": 0.5, "unit_price": 5.5, "total_price": 5.5, "product_name": "Jus de Pomme Pétillant", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 73, "tax_amount": 0.5, "unit_price": 5.5, "total_price": 5.5, "product_name": "Jus de Pomme Pétillant", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 105, "tax_amount": 0.5909090909090908, "unit_price": 6.5, "total_price": 6.5, "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 61.00€", "status": "completed", "total_tax": 7.25, "total_amount": 61, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 21:10:21.30712
118	\N	CREATE_ORDER	ORDER	39	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 58, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Picon", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 46, "tax_amount": 1.0000000000000002, "unit_price": 6, "total_price": 6, "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 52, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "NEIPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 81, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "CDR", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 104, "tax_amount": 0.7272727272727273, "unit_price": 8, "total_price": 8, "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 35.00€", "status": "completed", "total_tax": 5.2272727272727275, "total_amount": 35, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 21:28:30.967235
119	\N	CREATE_ORDER	ORDER	40	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 83, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Blaye", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 85, "tax_amount": 0.9166666666666667, "unit_price": 5.5, "total_price": 5.5, "product_name": "Chardo", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 12.00€", "status": "completed", "total_tax": 2, "total_amount": 12, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 21:30:46.500598
142	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:24:17.787393
121	\N	CREATE_ORDER	ORDER	42	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 51, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 104, "tax_amount": 0.7272727272727273, "unit_price": 8, "total_price": 8, "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 104, "tax_amount": 0.7272727272727273, "unit_price": 8, "total_price": 8, "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 81, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "CDR", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 89, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Uby 4", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Carte 13.00€, Part 2: Carte 20.50€", "status": "completed", "total_tax": 4.371212121212121, "total_amount": 33.5, "payment_method": "split"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 21:35:43.164955
122	\N	CREATE_ORDER	ORDER	43	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 64, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 8.00€", "status": "completed", "total_tax": 1.3333333333333335, "total_amount": 8, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 21:42:55.395231
123	\N	CREATE_ORDER	ORDER	44	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 7.50€", "status": "completed", "total_tax": 1.25, "total_amount": 7.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:09:49.188856
124	\N	CREATE_ORDER	ORDER	45	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 57, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 12.00€", "status": "completed", "total_tax": 2, "total_amount": 12, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:11:16.998278
125	\N	CREATE_ORDER	ORDER	46	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 57, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 12.00€", "status": "completed", "total_tax": 2, "total_amount": 12, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:11:53.978079
126	\N	CREATE_ORDER	ORDER	47	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 64, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 64, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 64, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 24.00€", "status": "completed", "total_tax": 4, "total_amount": 24, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:12:44.185374
127	\N	CREATE_ORDER	ORDER	48	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 64, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 8.00€", "status": "completed", "total_tax": 1.3333333333333335, "total_amount": 8, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:17:23.281426
143	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:24:17.794956
149	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 20:07:08.184376
152	1	RESTORE_CATEGORY	CATEGORY	33	{"category_id": 33}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 14:19:38.169713
156	\N	CREATE_ORDER	ORDER	55	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 21.00€", "change": 0, "status": "completed", "total_tax": 1.909090909090909, "total_amount": 21, "payment_method": "card"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 10:16:07.950106
128	\N	CREATE_ORDER	ORDER	49	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 65, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Cocktail du moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 46, "tax_amount": 1.0000000000000002, "unit_price": 6, "total_price": 6, "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 46, "tax_amount": 1.0000000000000002, "unit_price": 6, "total_price": 6, "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 43, "tax_amount": 0.5, "unit_price": 5.5, "total_price": 5.5, "product_name": "Dry Quiri", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split égal - 2 parts: Part 1: Carte 23.25€, Part 2: Carte 23.25€", "status": "completed", "total_tax": 5.742424242424243, "total_amount": 46.5, "payment_method": "split"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:28:11.133844
129	\N	CREATE_ORDER	ORDER	50	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 76, "tax_amount": 0.5, "unit_price": 5.5, "total_price": 5.5, "product_name": "Citronnade", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 43, "tax_amount": 0.5, "unit_price": 5.5, "total_price": 5.5, "product_name": "Dry Quiri", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 49, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 44, "tax_amount": 0.5, "unit_price": 5.5, "total_price": 5.5, "product_name": "Bissap", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 21.00€", "status": "completed", "total_tax": 2.25, "total_amount": 21, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:28:46.409602
130	\N	CREATE_ORDER	ORDER	51	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 21.00€", "status": "completed", "total_tax": 1.909090909090909, "total_amount": 21, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:29:43.299972
131	\N	CREATE_ORDER	ORDER	52	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 89, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Uby 4", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 50, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 51, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 15.50€", "status": "completed", "total_tax": 2.5833333333333335, "total_amount": 15.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:39:00.139081
132	\N	CREATE_ORDER	ORDER	53	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 7.50€", "status": "completed", "total_tax": 1.25, "total_amount": 7.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:59:52.219845
133	\N	CREATE_ORDER	ORDER	54	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 7.50€", "status": "completed", "total_tax": 1.25, "total_amount": 7.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 23:29:51.162918
134	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:10:50.418923
135	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:10:55.593946
136	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:11:09.004743
137	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:11:22.80186
138	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:14:11.585048
139	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:14:13.985223
140	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:23:39.491266
141	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:23:39.49408
153	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 21:46:39.960035
157	1	RETOUR_ITEM	ORDER	56	{"reason": "Test", "retour_item": {"id": 130, "order_id": 56, "quantity": -1, "tax_rate": "10.00", "created_at": "2025-07-11T08:16:46.382Z", "product_id": 103, "tax_amount": "-1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "-21.00", "product_name": "[RETOUR] Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 10:16:46.39892
167	\N	CREATE_ORDER	ORDER	61	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Espèces 21.00€, Part 2: Carte 21.00€", "change": 0, "status": "completed", "total_tax": 3.818181818181818, "total_amount": 42, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 15:45:13.176711
176	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 17:42:32.75026
158	\N	CREATE_ORDER	ORDER	57	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 20, "product_id": 94, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Bellini", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 97, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Baileys", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Espèces 6.50€, Part 2: Carte 6.50€", "change": 0, "status": "completed", "total_tax": 2.166666666666667, "total_amount": 13, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 10:59:20.222977
168	\N	CREATE_ORDER	ORDER	62	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Espèces 21.00€, Part 2: Carte 21.00€", "change": 0, "status": "completed", "total_tax": 3.818181818181818, "total_amount": 42, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 15:52:43.401151
177	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 21:17:23.232052
159	\N	CREATE_ORDER	ORDER	58	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 94, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Bellini", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 27.50€", "change": 0, "status": "completed", "total_tax": 2.992424242424242, "total_amount": 27.5, "payment_method": "card"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 11:18:41.444842
169	\N	CREATE_ORDER	ORDER	63	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Espèces 21.00€, Part 2: Carte 21.00€", "change": 0, "status": "completed", "total_tax": 3.818181818181818, "total_amount": 42, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 15:53:23.173763
160	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 12:46:44.965893
170	\N	CREATE_ORDER	ORDER	64	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Carte 21.00€, Part 2: Espèces 21.00€", "change": 0, "status": "completed", "total_tax": 3.818181818181818, "total_amount": 42, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 15:58:26.815122
161	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 13:04:24.049864
171	\N	CREATE_ORDER	ORDER	65	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Carte 21.00€, Part 2: Espèces 21.00€", "change": 0, "status": "completed", "total_tax": 3.818181818181818, "total_amount": 42, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 15:59:32.713808
162	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 13:30:13.312805
172	\N	CREATE_ORDER	ORDER	66	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Espèces 21.00€, Part 2: Carte 21.00€", "change": 0, "status": "completed", "sub_bills": [{"amount": 0, "payment_method": "cash"}, {"amount": 21, "payment_method": "card"}], "total_tax": 3.818181818181818, "total_amount": 42, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 16:01:41.845368
163	\N	CREATE_ORDER	ORDER	59	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 20, "product_id": 95, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Americano", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 6.50€", "change": 0, "status": "completed", "total_tax": 1.0833333333333335, "total_amount": 6.5, "payment_method": "card"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 13:35:42.133596
173	\N	CREATE_ORDER	ORDER	67	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Espèces 21.00€, Part 2: Carte 21.00€", "change": 0, "status": "completed", "sub_bills": [{"amount": 21, "status": "paid", "payment_method": "cash"}, {"amount": 21, "status": "paid", "payment_method": "card"}], "total_tax": 3.818181818181818, "total_amount": 42, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 16:03:39.554466
164	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 14:51:07.07756
174	\N	CREATE_ORDER	ORDER	68	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Espèces 21.00€, Part 2: Carte 21.00€", "change": 0, "status": "completed", "sub_bills": [{"amount": 21, "status": "paid", "payment_method": "cash"}, {"amount": 21, "status": "paid", "payment_method": "card"}], "total_tax": 3.818181818181818, "total_amount": 42, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 16:05:44.733876
165	\N	CREATE_ORDER	ORDER	60	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split égal - 2 parts: Part 1: Carte 21.00€, Part 2: Espèces 21.00€", "change": 0, "status": "completed", "total_tax": 3.818181818181818, "total_amount": 42, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 15:31:10.353623
175	\N	CREATE_ORDER	ORDER	69	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Espèces 21.00€, Part 2: Split 10.50€ espèces + 10.50€ carte", "change": 0, "status": "completed", "sub_bills": [{"amount": 21, "status": "paid", "payment_method": "cash"}, {"amount": 10.5, "status": "paid", "payment_method": "cash"}, {"amount": 10.5, "status": "paid", "payment_method": "card"}], "total_tax": 3.818181818181818, "total_amount": 42, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 16:06:50.819493
\.


--
-- Data for Name: business_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_settings (id, name, address, phone, email, siret, tax_identification, updated_at) FROM stdin;
2	MuseBar	4 Impasse des Hauts Mariages, 76000 Rouen	0601194462	elliot.vergne@gmail.com	93133471800018	563865792	2025-07-11 13:14:09.078
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, default_tax_rate, created_at, updated_at, is_active) FROM stdin;
26	Bières	20.00	2025-07-04 13:22:59.572594	2025-07-04 14:29:34.848257	t
28	Cocktails	20.00	2025-07-04 18:38:29.471631	2025-07-04 18:38:29.471631	t
29	Mocktails	20.00	2025-07-05 17:16:09.871415	2025-07-05 17:16:09.871415	t
30	Softs	20.00	2025-07-05 17:20:23.8818	2025-07-05 17:20:23.8818	t
31	Vins	20.00	2025-07-05 17:57:44.937255	2025-07-05 17:57:44.937255	t
32	Apéritifs	20.00	2025-07-05 18:02:20.297511	2025-07-05 18:02:20.297511	t
33	A Manger	20.00	2025-07-05 18:11:13.935242	2025-07-08 14:19:38.165686	t
34	Bières	20.00	2025-07-11 12:40:08.908513	2025-07-11 12:40:08.908513	t
35	Vins	20.00	2025-07-11 12:40:08.908513	2025-07-11 12:40:08.908513	t
36	Cocktails	20.00	2025-07-11 12:40:08.908513	2025-07-11 12:40:08.908513	t
37	Softs	10.00	2025-07-11 12:40:08.908513	2025-07-11 12:40:08.908513	t
38	Snacks	10.00	2025-07-11 12:40:08.908513	2025-07-11 12:40:08.908513	t
\.


--
-- Data for Name: closure_bulletins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.closure_bulletins (id, closure_type, period_start, period_end, total_transactions, total_amount, total_vat, vat_breakdown, payment_methods_breakdown, first_sequence, last_sequence, closure_hash, is_closed, closed_at, created_at, tips_total, change_total) FROM stdin;
1	DAILY	2025-07-05 00:00:00	2025-07-05 23:59:59.999	54	880.50	128.07	{"vat_10": {"vat": 4.28, "amount": 47}, "vat_20": {"vat": 67.83, "amount": 407}}	{"card": 721.5, "cash": 24, "split": 135}	1	55	a4535f2cdfea960cd74bef50dd5db86b999a6c8d58891c2f23c779dd2539a414	t	2025-07-05 23:57:43.252	2025-07-05 23:57:43.252548	0	0
5	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	0	0	53e52e0d8c8b07c1ddb495a41b4331bb7e714c8ec1c8fdeed5b72176577c1218	t	2025-07-11 21:19:24.458	2025-07-11 21:19:24.458968	0	0
\.


--
-- Data for Name: closure_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.closure_settings (id, setting_key, setting_value, description, updated_by, updated_at) FROM stdin;
3	timezone	Europe/Paris	Timezone for closure calculations	SYSTEM	2025-07-05 17:12:35.375897
1	daily_closure_time	02:00	Time when daily closure is automatically triggered (HH:MM format)	SYSTEM	2025-07-11 13:09:53.166362
2	auto_closure_enabled	true	Whether automatic daily closure is enabled	SYSTEM	2025-07-11 13:09:53.1764
4	closure_grace_period_minutes	30	Grace period in minutes before auto-closure	SYSTEM	2025-07-11 13:09:53.183598
\.


--
-- Data for Name: legal_journal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.legal_journal (id, sequence_number, transaction_type, order_id, amount, vat_amount, payment_method, transaction_data, previous_hash, current_hash, "timestamp", user_id, register_id, created_at) FROM stdin;
1	1	ARCHIVE	\N	0.00	0.00	SYSTEM	{"type": "SYSTEM_INIT", "message": "Legal journal initialized for production", "compliance": "Article 286-I-3 bis du CGI", "environment": "PRODUCTION", "admin_preserved": true}	0000000000000000000000000000000000000000000000000000000000000000	a9f5537f36231937c86937934900461dc1b643bb958d637e86fe71390b932b41	2025-07-05 17:12:35.341	1	MUSEBAR-REG-001	2025-07-05 17:12:35.34262
2	2	SALE	1	6.50	1.08	card	{"items": [{"id": 1, "order_id": 1, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T15:15:08.335Z", "product_id": 40, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Triple", "happy_hour_applied": true, "happy_hour_discount_amount": "1.63"}], "order_id": 1, "timestamp": "2025-07-05T15:15:08.322Z", "register_id": "MUSEBAR-REG-001"}	a9f5537f36231937c86937934900461dc1b643bb958d637e86fe71390b932b41	519afd37deb3183c49bf3db778eaeff51c5d6f7a33a964a75326208c66e3b37c	2025-07-05 17:15:08.347	\N	MUSEBAR-REG-001	2025-07-05 17:15:08.347835
3	3	SALE	2	13.50	2.25	card	{"items": [{"id": 2, "order_id": 2, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T15:15:21.783Z", "product_id": 41, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Blanche", "happy_hour_applied": true, "happy_hour_discount_amount": "1.63"}, {"id": 3, "order_id": 2, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T15:15:21.788Z", "product_id": 42, "tax_amount": "1.17", "unit_price": "7.00", "sub_bill_id": null, "total_price": "7.00", "product_name": "Spritz Sureau", "happy_hour_applied": true, "happy_hour_discount_amount": "1.75"}], "order_id": 2, "timestamp": "2025-07-05T15:15:21.771Z", "register_id": "MUSEBAR-REG-001"}	519afd37deb3183c49bf3db778eaeff51c5d6f7a33a964a75326208c66e3b37c	096b726d25251b6f6bb99f6f21d499880d55e40d80c10919c0fef50786b7c415	2025-07-05 17:15:21.794	\N	MUSEBAR-REG-001	2025-07-05 17:15:21.795426
4	4	SALE	3	9.00	0.82	card	{"items": [{"id": 4, "order_id": 3, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T15:22:25.840Z", "product_id": 44, "tax_amount": "0.41", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Bissap", "happy_hour_applied": true, "happy_hour_discount_amount": "1.13"}, {"id": 5, "order_id": 3, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T15:22:25.855Z", "product_id": 43, "tax_amount": "0.41", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Dry Quiri", "happy_hour_applied": true, "happy_hour_discount_amount": "1.13"}], "order_id": 3, "timestamp": "2025-07-05T15:22:25.828Z", "register_id": "MUSEBAR-REG-001"}	096b726d25251b6f6bb99f6f21d499880d55e40d80c10919c0fef50786b7c415	678c4fbcec2ed877d8340dce71135ead0dd04edfc63ebc06524685a2f5dd7247	2025-07-05 17:22:25.862	\N	MUSEBAR-REG-001	2025-07-05 17:22:25.862842
5	5	SALE	4	11.00	1.49	card	{"items": [{"id": 6, "order_id": 4, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T15:23:06.002Z", "product_id": 39, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "IPA", "happy_hour_applied": true, "happy_hour_discount_amount": "1.63"}, {"id": 7, "order_id": 4, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T15:23:06.008Z", "product_id": 45, "tax_amount": "0.41", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Ginger", "happy_hour_applied": true, "happy_hour_discount_amount": "1.13"}], "order_id": 4, "timestamp": "2025-07-05T15:23:05.998Z", "register_id": "MUSEBAR-REG-001"}	678c4fbcec2ed877d8340dce71135ead0dd04edfc63ebc06524685a2f5dd7247	cc2ef374b3a7e76864661b272dcb7626f552b03732612118f981d9eaaf566aee	2025-07-05 17:23:06.014	\N	MUSEBAR-REG-001	2025-07-05 17:23:06.014663
6	6	SALE	5	6.50	0.86	card	{"items": [{"id": 8, "order_id": 5, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T15:41:47.188Z", "product_id": 47, "tax_amount": "0.58", "unit_price": "3.50", "sub_bill_id": null, "total_price": "3.50", "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 9, "order_id": 5, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T15:41:47.198Z", "product_id": 60, "tax_amount": "0.27", "unit_price": "3.00", "sub_bill_id": null, "total_price": "3.00", "product_name": "Coca", "happy_hour_applied": true, "happy_hour_discount_amount": "0.75"}], "order_id": 5, "timestamp": "2025-07-05T15:41:47.175Z", "register_id": "MUSEBAR-REG-001"}	cc2ef374b3a7e76864661b272dcb7626f552b03732612118f981d9eaaf566aee	1af84906fd8b848a8d634629b9dc27253137849362b6e7b9bd1e54a33b6e40f1	2025-07-05 17:41:47.204	\N	MUSEBAR-REG-001	2025-07-05 17:41:47.2053
7	7	SALE	6	11.00	1.34	card	{"items": [{"id": 10, "order_id": 6, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T15:53:54.652Z", "product_id": 77, "tax_amount": "0.18", "unit_price": "2.00", "sub_bill_id": null, "total_price": "2.00", "product_name": "Sirop", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 11, "order_id": 6, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T15:53:54.659Z", "product_id": 51, "tax_amount": "0.75", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 12, "order_id": 6, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T15:53:54.663Z", "product_id": 76, "tax_amount": "0.41", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Citronnade", "happy_hour_applied": true, "happy_hour_discount_amount": "1.13"}], "order_id": 6, "timestamp": "2025-07-05T15:53:54.639Z", "register_id": "MUSEBAR-REG-001"}	1af84906fd8b848a8d634629b9dc27253137849362b6e7b9bd1e54a33b6e40f1	cb790c61e66967f331a423e326183e1195e423a422629d5a1e1c410336a1475f	2025-07-05 17:53:54.669	\N	MUSEBAR-REG-001	2025-07-05 17:53:54.670677
8	8	SALE	7	11.50	1.92	card	{"items": [{"id": 13, "order_id": 7, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T15:55:33.870Z", "product_id": 39, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "IPA", "happy_hour_applied": true, "happy_hour_discount_amount": "1.63"}, {"id": 14, "order_id": 7, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T15:55:33.890Z", "product_id": 46, "tax_amount": "0.83", "unit_price": "5.00", "sub_bill_id": null, "total_price": "5.00", "product_name": "Blonde de Soif", "happy_hour_applied": true, "happy_hour_discount_amount": "1.25"}], "order_id": 7, "timestamp": "2025-07-05T15:55:33.866Z", "register_id": "MUSEBAR-REG-001"}	cb790c61e66967f331a423e326183e1195e423a422629d5a1e1c410336a1475f	5841e8e93327ca770d0dcfc9503caf2df01515bcb6841c3a5de9cb9c1e7d0f89	2025-07-05 17:55:33.896	\N	MUSEBAR-REG-001	2025-07-05 17:55:33.897443
9	9	SALE	8	9.00	0.82	cash	{"items": [{"id": 15, "order_id": 8, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T16:30:42.506Z", "product_id": 76, "tax_amount": "0.41", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Citronnade", "happy_hour_applied": true, "happy_hour_discount_amount": "1.13"}, {"id": 16, "order_id": 8, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T16:30:42.525Z", "product_id": 44, "tax_amount": "0.41", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Bissap", "happy_hour_applied": true, "happy_hour_discount_amount": "1.13"}], "order_id": 8, "timestamp": "2025-07-05T16:30:42.494Z", "register_id": "MUSEBAR-REG-001"}	5841e8e93327ca770d0dcfc9503caf2df01515bcb6841c3a5de9cb9c1e7d0f89	497b3c7c9e76251fce61346aba2263b1339b35a6461e9e8ffdf1d4c5eaa7e8e7	2025-07-05 18:30:42.532	\N	MUSEBAR-REG-001	2025-07-05 18:30:42.532883
10	10	SALE	9	3.50	0.58	card	{"items": [{"id": 17, "order_id": 9, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T16:36:03.611Z", "product_id": 47, "tax_amount": "0.58", "unit_price": "3.50", "sub_bill_id": null, "total_price": "3.50", "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 9, "timestamp": "2025-07-05T16:36:03.598Z", "register_id": "MUSEBAR-REG-001"}	497b3c7c9e76251fce61346aba2263b1339b35a6461e9e8ffdf1d4c5eaa7e8e7	8fbd0fe95b2861e18c703f11449b49f796e13c409b9df6365095a133858f1560	2025-07-05 18:36:03.62	\N	MUSEBAR-REG-001	2025-07-05 18:36:03.620939
11	11	SALE	10	37.00	4.80	card	{"items": [{"id": 18, "order_id": 10, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T16:45:06.385Z", "product_id": 44, "tax_amount": "0.41", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Bissap", "happy_hour_applied": true, "happy_hour_discount_amount": "1.13"}, {"id": 19, "order_id": 10, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T16:45:06.391Z", "product_id": 73, "tax_amount": "0.41", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Jus de Pomme Pétillant", "happy_hour_applied": true, "happy_hour_discount_amount": "1.13"}, {"id": 20, "order_id": 10, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T16:45:06.395Z", "product_id": 76, "tax_amount": "0.41", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Citronnade", "happy_hour_applied": true, "happy_hour_discount_amount": "1.13"}, {"id": 21, "order_id": 10, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T16:45:06.399Z", "product_id": 44, "tax_amount": "0.41", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Bissap", "happy_hour_applied": true, "happy_hour_discount_amount": "1.13"}, {"id": 22, "order_id": 10, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T16:45:06.404Z", "product_id": 66, "tax_amount": "1.00", "unit_price": "6.00", "sub_bill_id": null, "total_price": "6.00", "product_name": "Caïpi", "happy_hour_applied": true, "happy_hour_discount_amount": "1.50"}, {"id": 23, "order_id": 10, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T16:45:06.407Z", "product_id": 66, "tax_amount": "1.00", "unit_price": "6.00", "sub_bill_id": null, "total_price": "6.00", "product_name": "Caïpi", "happy_hour_applied": true, "happy_hour_discount_amount": "1.50"}, {"id": 24, "order_id": 10, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T16:45:06.412Z", "product_id": 65, "tax_amount": "1.17", "unit_price": "7.00", "sub_bill_id": null, "total_price": "7.00", "product_name": "Cocktail du moment", "happy_hour_applied": true, "happy_hour_discount_amount": "1.75"}], "order_id": 10, "timestamp": "2025-07-05T16:45:06.373Z", "register_id": "MUSEBAR-REG-001"}	8fbd0fe95b2861e18c703f11449b49f796e13c409b9df6365095a133858f1560	5082e94236440fe9d80499161844e2a191929408beb7f935eab44f2d5ab68a3a	2025-07-05 18:45:06.418	\N	MUSEBAR-REG-001	2025-07-05 18:45:06.418766
12	12	SALE	11	18.00	3.00	split	{"items": [{"id": 25, "order_id": 11, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T16:49:00.049Z", "product_id": 39, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "IPA", "happy_hour_applied": true, "happy_hour_discount_amount": "1.63"}, {"id": 26, "order_id": 11, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T16:49:00.067Z", "product_id": 39, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "IPA", "happy_hour_applied": true, "happy_hour_discount_amount": "1.63"}, {"id": 27, "order_id": 11, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T16:49:00.071Z", "product_id": 46, "tax_amount": "0.83", "unit_price": "5.00", "sub_bill_id": null, "total_price": "5.00", "product_name": "Blonde de Soif", "happy_hour_applied": true, "happy_hour_discount_amount": "1.25"}], "order_id": 11, "timestamp": "2025-07-05T16:49:00.037Z", "register_id": "MUSEBAR-REG-001"}	5082e94236440fe9d80499161844e2a191929408beb7f935eab44f2d5ab68a3a	80cb8497272532001c40b39f2b017e9acc32e76e3aab94dedd340d4c1541005f	2025-07-05 18:49:00.077	\N	MUSEBAR-REG-001	2025-07-05 18:49:00.078213
13	13	SALE	12	6.50	1.08	card	{"items": [{"id": 28, "order_id": 12, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T16:57:28.088Z", "product_id": 40, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Triple", "happy_hour_applied": true, "happy_hour_discount_amount": "1.63"}], "order_id": 12, "timestamp": "2025-07-05T16:57:28.076Z", "register_id": "MUSEBAR-REG-001"}	80cb8497272532001c40b39f2b017e9acc32e76e3aab94dedd340d4c1541005f	66fe57be1a5047b87bcffd2d047929dd246d57f0a588d28e4ebbbdcf6e1754a4	2025-07-05 18:57:28.101	\N	MUSEBAR-REG-001	2025-07-05 18:57:28.101888
14	14	SALE	13	20.00	2.84	card	{"items": [{"id": 29, "order_id": 13, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T16:59:51.514Z", "product_id": 105, "tax_amount": "0.59", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 30, "order_id": 13, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T16:59:51.519Z", "product_id": 65, "tax_amount": "1.17", "unit_price": "7.00", "sub_bill_id": null, "total_price": "7.00", "product_name": "Cocktail du moment", "happy_hour_applied": true, "happy_hour_discount_amount": "1.75"}, {"id": 31, "order_id": 13, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T16:59:51.524Z", "product_id": 40, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Triple", "happy_hour_applied": true, "happy_hour_discount_amount": "1.63"}], "order_id": 13, "timestamp": "2025-07-05T16:59:51.509Z", "register_id": "MUSEBAR-REG-001"}	66fe57be1a5047b87bcffd2d047929dd246d57f0a588d28e4ebbbdcf6e1754a4	948acd4b3ba6b080c8b084d67fffa5340c9ef9df53704aefd15b9442e1dab567	2025-07-05 18:59:51.533	\N	MUSEBAR-REG-001	2025-07-05 18:59:51.5338
15	15	SALE	14	13.00	2.17	card	{"items": [{"id": 32, "order_id": 14, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:00:13.924Z", "product_id": 52, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "NEIPA", "happy_hour_applied": true, "happy_hour_discount_amount": "1.63"}, {"id": 33, "order_id": 14, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:00:13.937Z", "product_id": 52, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "NEIPA", "happy_hour_applied": true, "happy_hour_discount_amount": "1.63"}], "order_id": 14, "timestamp": "2025-07-05T17:00:13.921Z", "register_id": "MUSEBAR-REG-001"}	948acd4b3ba6b080c8b084d67fffa5340c9ef9df53704aefd15b9442e1dab567	02e3fde9e0008d59d250a6b363177f8a0be9c0a1ccf82e8e2111c6b0f19c3233	2025-07-05 19:00:13.943	\N	MUSEBAR-REG-001	2025-07-05 19:00:13.943772
16	16	SALE	15	42.50	5.49	card	{"items": [{"id": 34, "order_id": 15, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:08:33.347Z", "product_id": 53, "tax_amount": "0.75", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "NEIPA", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 35, "order_id": 15, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:08:33.372Z", "product_id": 47, "tax_amount": "0.58", "unit_price": "3.50", "sub_bill_id": null, "total_price": "3.50", "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 36, "order_id": 15, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T17:08:33.380Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 37, "order_id": 15, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:08:33.383Z", "product_id": 68, "tax_amount": "1.33", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Espresso Martini", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 38, "order_id": 15, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:08:33.386Z", "product_id": 85, "tax_amount": "0.92", "unit_price": "5.50", "sub_bill_id": null, "total_price": "5.50", "product_name": "Chardo", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 15, "timestamp": "2025-07-05T17:08:33.336Z", "register_id": "MUSEBAR-REG-001"}	02e3fde9e0008d59d250a6b363177f8a0be9c0a1ccf82e8e2111c6b0f19c3233	342897afdb223260fada9485954c88065bb9a1b28766a4232fe49b55b385a4a9	2025-07-05 19:08:33.393	\N	MUSEBAR-REG-001	2025-07-05 19:08:33.394021
17	17	SALE	16	25.00	3.75	card	{"items": [{"id": 39, "order_id": 16, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:20:46.072Z", "product_id": 37, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 40, "order_id": 16, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:20:46.082Z", "product_id": 37, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 41, "order_id": 16, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T17:20:46.089Z", "product_id": 43, "tax_amount": "0.50", "unit_price": "5.50", "sub_bill_id": null, "total_price": "5.50", "product_name": "Dry Quiri", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 42, "order_id": 16, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:20:46.093Z", "product_id": 57, "tax_amount": "0.75", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 16, "timestamp": "2025-07-05T17:20:46.060Z", "register_id": "MUSEBAR-REG-001"}	342897afdb223260fada9485954c88065bb9a1b28766a4232fe49b55b385a4a9	8f470070ff6768ca55b76fee25e510a4990c04724b1e2de914e90eace81a5187	2025-07-05 19:20:46.098	\N	MUSEBAR-REG-001	2025-07-05 19:20:46.100206
18	18	SALE	17	8.00	0.73	card	{"items": [{"id": 43, "order_id": 17, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T17:21:05.227Z", "product_id": 104, "tax_amount": "0.73", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 17, "timestamp": "2025-07-05T17:21:05.216Z", "register_id": "MUSEBAR-REG-001"}	8f470070ff6768ca55b76fee25e510a4990c04724b1e2de914e90eace81a5187	daf8f1c0231e86952770e9463079f520360ab4bd4d0841698e9c62dab63eb693	2025-07-05 19:21:05.233	\N	MUSEBAR-REG-001	2025-07-05 19:21:05.233586
19	19	SALE	18	22.00	3.67	split	{"items": [{"id": 44, "order_id": 18, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:23:12.050Z", "product_id": 37, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 45, "order_id": 18, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:23:12.069Z", "product_id": 40, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 46, "order_id": 18, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:23:12.072Z", "product_id": 61, "tax_amount": "1.17", "unit_price": "7.00", "sub_bill_id": null, "total_price": "7.00", "product_name": "Spritz Apérol", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 18, "timestamp": "2025-07-05T17:23:12.038Z", "register_id": "MUSEBAR-REG-001"}	daf8f1c0231e86952770e9463079f520360ab4bd4d0841698e9c62dab63eb693	fc7a2049bd023954956d88589dc34ac932fe6569b2ee6949cc82f9ff4f11d2af	2025-07-05 19:23:12.076	\N	MUSEBAR-REG-001	2025-07-05 19:23:12.076778
20	20	SALE	19	15.00	2.50	card	{"items": [{"id": 47, "order_id": 19, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:37:57.258Z", "product_id": 37, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 48, "order_id": 19, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:37:57.267Z", "product_id": 40, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 19, "timestamp": "2025-07-05T17:37:57.254Z", "register_id": "MUSEBAR-REG-001"}	fc7a2049bd023954956d88589dc34ac932fe6569b2ee6949cc82f9ff4f11d2af	4cbcca0d638b4d4cd831b0af7b74fa45e215668d5659db61642414d2df0075f4	2025-07-05 19:37:57.277	\N	MUSEBAR-REG-001	2025-07-05 19:37:57.277504
21	21	SALE	20	16.00	2.67	card	{"items": [{"id": 49, "order_id": 20, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:41:26.171Z", "product_id": 64, "tax_amount": "1.33", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 50, "order_id": 20, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:41:26.176Z", "product_id": 74, "tax_amount": "1.33", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "London Mule", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 20, "timestamp": "2025-07-05T17:41:26.159Z", "register_id": "MUSEBAR-REG-001"}	4cbcca0d638b4d4cd831b0af7b74fa45e215668d5659db61642414d2df0075f4	51294a6f6769ee167cc6131f3bd328a1255fdd1748e275f7e375135061634640	2025-07-05 19:41:26.181	\N	MUSEBAR-REG-001	2025-07-05 19:41:26.182471
22	22	SALE	21	15.00	2.50	card	{"items": [{"id": 51, "order_id": 21, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:48:01.076Z", "product_id": 66, "tax_amount": "1.17", "unit_price": "7.00", "sub_bill_id": null, "total_price": "7.00", "product_name": "Caïpi", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 52, "order_id": 21, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:48:01.082Z", "product_id": 64, "tax_amount": "1.33", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 21, "timestamp": "2025-07-05T17:48:01.063Z", "register_id": "MUSEBAR-REG-001"}	51294a6f6769ee167cc6131f3bd328a1255fdd1748e275f7e375135061634640	43c5b25fac4c2b4f06a202d0d4830f795a7bc2741eedd3baefd1ea147f1158a6	2025-07-05 19:48:01.087	\N	MUSEBAR-REG-001	2025-07-05 19:48:01.087553
23	23	SALE	22	15.00	2.50	card	{"items": [{"id": 53, "order_id": 22, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:51:10.475Z", "product_id": 56, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 54, "order_id": 22, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:51:10.483Z", "product_id": 56, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 22, "timestamp": "2025-07-05T17:51:10.462Z", "register_id": "MUSEBAR-REG-001"}	43c5b25fac4c2b4f06a202d0d4830f795a7bc2741eedd3baefd1ea147f1158a6	9663e83442f1ad1feb7b4ec49b928e5504edd9213cfb29ebcd90c4c679191ea8	2025-07-05 19:51:10.489	\N	MUSEBAR-REG-001	2025-07-05 19:51:10.490569
24	24	SALE	23	22.00	3.06	card	{"items": [{"id": 55, "order_id": 23, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T17:58:32.636Z", "product_id": 104, "tax_amount": "0.73", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 56, "order_id": 23, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:58:32.641Z", "product_id": 40, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 57, "order_id": 23, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T17:58:32.645Z", "product_id": 95, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Americano", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 23, "timestamp": "2025-07-05T17:58:32.631Z", "register_id": "MUSEBAR-REG-001"}	9663e83442f1ad1feb7b4ec49b928e5504edd9213cfb29ebcd90c4c679191ea8	ab4adbfbc90654eceec5dbbcae44fa135607f9f4ef8d48be118599deae655b52	2025-07-05 19:58:32.651	\N	MUSEBAR-REG-001	2025-07-05 19:58:32.651967
25	25	SALE	24	4.50	0.75	card	{"items": [{"id": 58, "order_id": 24, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:01:48.575Z", "product_id": 49, "tax_amount": "0.75", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 24, "timestamp": "2025-07-05T18:01:48.563Z", "register_id": "MUSEBAR-REG-001"}	ab4adbfbc90654eceec5dbbcae44fa135607f9f4ef8d48be118599deae655b52	238eab769074b2a5bd0e48216cbbb41cffe4f3da2b6353eef36a910fe08ac976	2025-07-05 20:01:48.583	\N	MUSEBAR-REG-001	2025-07-05 20:01:48.584106
26	26	SALE	25	15.00	2.50	split	{"items": [{"id": 59, "order_id": 25, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:07:17.532Z", "product_id": 39, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 60, "order_id": 25, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:07:17.550Z", "product_id": 56, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 25, "timestamp": "2025-07-05T18:07:17.520Z", "register_id": "MUSEBAR-REG-001"}	238eab769074b2a5bd0e48216cbbb41cffe4f3da2b6353eef36a910fe08ac976	2ddb713282a47100075f69851e5288d32ce97003e44c40ea358977762d7a8dfd	2025-07-05 20:07:17.556	\N	MUSEBAR-REG-001	2025-07-05 20:07:17.557513
27	27	SALE	26	4.50	0.75	card	{"items": [{"id": 61, "order_id": 26, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:07:55.457Z", "product_id": 53, "tax_amount": "0.75", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "NEIPA", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 26, "timestamp": "2025-07-05T18:07:55.439Z", "register_id": "MUSEBAR-REG-001"}	2ddb713282a47100075f69851e5288d32ce97003e44c40ea358977762d7a8dfd	0b383d6fe94c6939a8e697ea4c1fc40ed97bf53a0b53a1ad1195da397b062438	2025-07-05 20:07:55.461	\N	MUSEBAR-REG-001	2025-07-05 20:07:55.462091
28	28	SALE	27	7.50	1.25	card	{"items": [{"id": 62, "order_id": 27, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:09:52.576Z", "product_id": 39, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 27, "timestamp": "2025-07-05T18:09:52.564Z", "register_id": "MUSEBAR-REG-001"}	0b383d6fe94c6939a8e697ea4c1fc40ed97bf53a0b53a1ad1195da397b062438	307e36d9fd24778705a12d07f15e2c29d3010a42c53375aabdffa2d5a294e00f	2025-07-05 20:09:52.583	\N	MUSEBAR-REG-001	2025-07-05 20:09:52.583909
29	29	SALE	28	13.00	2.17	card	{"items": [{"id": 63, "order_id": 28, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:24:33.957Z", "product_id": 52, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "NEIPA", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 64, "order_id": 28, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:24:33.964Z", "product_id": 85, "tax_amount": "0.92", "unit_price": "5.50", "sub_bill_id": null, "total_price": "5.50", "product_name": "Chardo", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 28, "timestamp": "2025-07-05T18:24:33.944Z", "register_id": "MUSEBAR-REG-001"}	307e36d9fd24778705a12d07f15e2c29d3010a42c53375aabdffa2d5a294e00f	f119184ebe89baae5fda06b8d0a2d7edb3fc0c8737e04ff3e252af6c0efe5474	2025-07-05 20:24:33.97	\N	MUSEBAR-REG-001	2025-07-05 20:24:33.971054
30	30	SALE	29	14.50	2.42	card	{"items": [{"id": 65, "order_id": 29, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:28:08.255Z", "product_id": 37, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 66, "order_id": 29, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:28:08.260Z", "product_id": 61, "tax_amount": "1.17", "unit_price": "7.00", "sub_bill_id": null, "total_price": "7.00", "product_name": "Spritz Apérol", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 29, "timestamp": "2025-07-05T18:28:08.243Z", "register_id": "MUSEBAR-REG-001"}	f119184ebe89baae5fda06b8d0a2d7edb3fc0c8737e04ff3e252af6c0efe5474	4d957ffdd0bb4bd02012dfceb8dd97e0b973d99cc06208877628ed9f186b6c12	2025-07-05 20:28:08.265	\N	MUSEBAR-REG-001	2025-07-05 20:28:08.266242
31	31	SALE	30	14.00	2.33	card	{"items": [{"id": 67, "order_id": 30, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:28:40.604Z", "product_id": 95, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Americano", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 68, "order_id": 30, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:28:40.610Z", "product_id": 40, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 30, "timestamp": "2025-07-05T18:28:40.591Z", "register_id": "MUSEBAR-REG-001"}	4d957ffdd0bb4bd02012dfceb8dd97e0b973d99cc06208877628ed9f186b6c12	342b5d40bb1f071004d57962bd946878724c5493e3d8978eebe2d0e4bf8ad269	2025-07-05 20:28:40.615	\N	MUSEBAR-REG-001	2025-07-05 20:28:40.616235
32	32	SALE	31	15.00	2.50	cash	{"items": [{"id": 69, "order_id": 31, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:31:15.367Z", "product_id": 40, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 70, "order_id": 31, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:31:15.372Z", "product_id": 39, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 31, "timestamp": "2025-07-05T18:31:15.363Z", "register_id": "MUSEBAR-REG-001"}	342b5d40bb1f071004d57962bd946878724c5493e3d8978eebe2d0e4bf8ad269	9be70f20556691eede1cac23880ba55025feae97ff71bc219a3f7ec16ee3502b	2025-07-05 20:31:15.376	\N	MUSEBAR-REG-001	2025-07-05 20:31:15.376333
33	33	SALE	32	9.00	1.50	card	{"items": [{"id": 71, "order_id": 32, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:31:26.253Z", "product_id": 50, "tax_amount": "0.75", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 72, "order_id": 32, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:31:26.258Z", "product_id": 55, "tax_amount": "0.75", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Rouge", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 32, "timestamp": "2025-07-05T18:31:26.249Z", "register_id": "MUSEBAR-REG-001"}	9be70f20556691eede1cac23880ba55025feae97ff71bc219a3f7ec16ee3502b	5b039a490cd866b02fc81129b26d3061e33097838bc5e4c4f414f05a8d606737	2025-07-05 20:31:26.263	\N	MUSEBAR-REG-001	2025-07-05 20:31:26.263622
34	34	SALE	33	7.50	1.25	card	{"items": [{"id": 73, "order_id": 33, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:34:06.532Z", "product_id": 37, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 33, "timestamp": "2025-07-05T18:34:06.521Z", "register_id": "MUSEBAR-REG-001"}	5b039a490cd866b02fc81129b26d3061e33097838bc5e4c4f414f05a8d606737	8b1cef128117639eaef9c4814b1680233bb50ef018680cb9cc13fc8b5dfdac87	2025-07-05 20:34:06.544	\N	MUSEBAR-REG-001	2025-07-05 20:34:06.54514
35	35	SALE	34	6.50	1.08	card	{"items": [{"id": 74, "order_id": 34, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:35:14.032Z", "product_id": 87, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Uby 3", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 34, "timestamp": "2025-07-05T18:35:14.020Z", "register_id": "MUSEBAR-REG-001"}	8b1cef128117639eaef9c4814b1680233bb50ef018680cb9cc13fc8b5dfdac87	32f245bf937a289dfa5dc27f063bfabfef224e24fbcc2be5dc69baa978704e62	2025-07-05 20:35:14.039	\N	MUSEBAR-REG-001	2025-07-05 20:35:14.04037
36	36	SALE	35	54.50	7.49	card	{"items": [{"id": 75, "order_id": 35, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:36:59.733Z", "product_id": 39, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 76, "order_id": 35, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:36:59.738Z", "product_id": 37, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 77, "order_id": 35, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:36:59.742Z", "product_id": 37, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 78, "order_id": 35, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:36:59.746Z", "product_id": 39, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 79, "order_id": 35, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:36:59.752Z", "product_id": 47, "tax_amount": "0.58", "unit_price": "3.50", "sub_bill_id": null, "total_price": "3.50", "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 80, "order_id": 35, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T18:36:59.755Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 35, "timestamp": "2025-07-05T18:36:59.721Z", "register_id": "MUSEBAR-REG-001"}	32f245bf937a289dfa5dc27f063bfabfef224e24fbcc2be5dc69baa978704e62	4064d19c352a033fe5259df1bb0fdd13e45be6bc452e0da51b8b1be903b3d718	2025-07-05 20:36:59.761	\N	MUSEBAR-REG-001	2025-07-05 20:36:59.76246
37	37	SALE	36	14.50	2.42	card	{"items": [{"id": 81, "order_id": 36, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:51:24.172Z", "product_id": 107, "tax_amount": "1.17", "unit_price": "7.00", "sub_bill_id": null, "total_price": "7.00", "product_name": "Ti Punch", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 82, "order_id": 36, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T18:51:24.178Z", "product_id": 40, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 36, "timestamp": "2025-07-05T18:51:24.159Z", "register_id": "MUSEBAR-REG-001"}	4064d19c352a033fe5259df1bb0fdd13e45be6bc452e0da51b8b1be903b3d718	42756d1f6d5f2e5b7697fde808519364bc7c8e70460db3b46d4aac538e217d02	2025-07-05 20:51:24.183	\N	MUSEBAR-REG-001	2025-07-05 20:51:24.184368
38	38	SALE	37	7.50	1.25	card	{"items": [{"id": 83, "order_id": 37, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T19:07:16.554Z", "product_id": 106, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Blanche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 37, "timestamp": "2025-07-05T19:07:16.542Z", "register_id": "MUSEBAR-REG-001"}	42756d1f6d5f2e5b7697fde808519364bc7c8e70460db3b46d4aac538e217d02	a0d5c7a4eb9344b2638bd1f52e4308964556504f590dd61902e6c062279972e1	2025-07-05 21:07:16.564	\N	MUSEBAR-REG-001	2025-07-05 21:07:16.564573
39	39	SALE	38	61.00	7.25	card	{"items": [{"id": 84, "order_id": 38, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T19:10:21.269Z", "product_id": 106, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Blanche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 85, "order_id": 38, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T19:10:21.275Z", "product_id": 37, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 86, "order_id": 38, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T19:10:21.279Z", "product_id": 40, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 87, "order_id": 38, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T19:10:21.283Z", "product_id": 73, "tax_amount": "0.50", "unit_price": "5.50", "sub_bill_id": null, "total_price": "5.50", "product_name": "Jus de Pomme Pétillant", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 88, "order_id": 38, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T19:10:21.287Z", "product_id": 73, "tax_amount": "0.50", "unit_price": "5.50", "sub_bill_id": null, "total_price": "5.50", "product_name": "Jus de Pomme Pétillant", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 89, "order_id": 38, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T19:10:21.291Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 90, "order_id": 38, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T19:10:21.295Z", "product_id": 105, "tax_amount": "0.59", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 38, "timestamp": "2025-07-05T19:10:21.257Z", "register_id": "MUSEBAR-REG-001"}	a0d5c7a4eb9344b2638bd1f52e4308964556504f590dd61902e6c062279972e1	f8a57a1aac51ff1b9ae838ac43fe800f61b0b36ef0f705d484ee84d69f68ea4b	2025-07-05 21:10:21.3	\N	MUSEBAR-REG-001	2025-07-05 21:10:21.301378
40	40	SALE	39	35.00	5.23	card	{"items": [{"id": 91, "order_id": 39, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T19:28:30.937Z", "product_id": 58, "tax_amount": "1.17", "unit_price": "7.00", "sub_bill_id": null, "total_price": "7.00", "product_name": "Picon", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 92, "order_id": 39, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T19:28:30.943Z", "product_id": 46, "tax_amount": "1.00", "unit_price": "6.00", "sub_bill_id": null, "total_price": "6.00", "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 93, "order_id": 39, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T19:28:30.947Z", "product_id": 52, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "NEIPA", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 94, "order_id": 39, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T19:28:30.951Z", "product_id": 81, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "CDR", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 95, "order_id": 39, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T19:28:30.954Z", "product_id": 104, "tax_amount": "0.73", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 39, "timestamp": "2025-07-05T19:28:30.925Z", "register_id": "MUSEBAR-REG-001"}	f8a57a1aac51ff1b9ae838ac43fe800f61b0b36ef0f705d484ee84d69f68ea4b	524299b576ff6ee44b1d3250659d81a324ba68696543d634eeaf8b127ecd4eba	2025-07-05 21:28:30.96	\N	MUSEBAR-REG-001	2025-07-05 21:28:30.96061
41	41	SALE	40	12.00	2.00	card	{"items": [{"id": 96, "order_id": 40, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T19:30:46.469Z", "product_id": 83, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Blaye", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 97, "order_id": 40, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T19:30:46.479Z", "product_id": 85, "tax_amount": "0.92", "unit_price": "5.50", "sub_bill_id": null, "total_price": "5.50", "product_name": "Chardo", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 40, "timestamp": "2025-07-05T19:30:46.457Z", "register_id": "MUSEBAR-REG-001"}	524299b576ff6ee44b1d3250659d81a324ba68696543d634eeaf8b127ecd4eba	150d9d6019e05b6b33901e13cea743086adda980471a13f82a6ff07d1489e62c	2025-07-05 21:30:46.493	\N	MUSEBAR-REG-001	2025-07-05 21:30:46.493986
42	42	SALE	41	4.50	0.75	card	{"items": [{"id": 98, "order_id": 41, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T19:32:05.647Z", "product_id": 51, "tax_amount": "0.75", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 41, "timestamp": "2025-07-05T19:32:05.635Z", "register_id": "MUSEBAR-REG-001"}	150d9d6019e05b6b33901e13cea743086adda980471a13f82a6ff07d1489e62c	94acd23eadb32a0d38fd3250df06e5f7b9991aadbede614ff7e0a374679f651c	2025-07-05 21:32:05.67	\N	MUSEBAR-REG-001	2025-07-05 21:32:05.671471
43	43	SALE	42	33.50	4.37	split	{"items": [{"id": 99, "order_id": 42, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T19:35:43.135Z", "product_id": 51, "tax_amount": "0.75", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 100, "order_id": 42, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T19:35:43.141Z", "product_id": 104, "tax_amount": "0.73", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 101, "order_id": 42, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T19:35:43.145Z", "product_id": 104, "tax_amount": "0.73", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 102, "order_id": 42, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T19:35:43.149Z", "product_id": 81, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "CDR", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 103, "order_id": 42, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T19:35:43.153Z", "product_id": 89, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Uby 4", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 42, "timestamp": "2025-07-05T19:35:43.124Z", "register_id": "MUSEBAR-REG-001"}	94acd23eadb32a0d38fd3250df06e5f7b9991aadbede614ff7e0a374679f651c	230870c3139982b481172bc6872b375c0419d907c4e1852482f9686b90db97bb	2025-07-05 21:35:43.159	\N	MUSEBAR-REG-001	2025-07-05 21:35:43.160365
44	44	SALE	43	8.00	1.33	card	{"items": [{"id": 104, "order_id": 43, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T19:42:55.360Z", "product_id": 64, "tax_amount": "1.33", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 43, "timestamp": "2025-07-05T19:42:55.348Z", "register_id": "MUSEBAR-REG-001"}	230870c3139982b481172bc6872b375c0419d907c4e1852482f9686b90db97bb	873156ba42227ac2de549a4d1d3898c5dfaab51820e4eb982213d09d07c27a7a	2025-07-05 21:42:55.389	\N	MUSEBAR-REG-001	2025-07-05 21:42:55.39012
45	45	SALE	44	7.50	1.25	card	{"items": [{"id": 105, "order_id": 44, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:09:49.177Z", "product_id": 39, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 44, "timestamp": "2025-07-05T20:09:49.164Z", "register_id": "MUSEBAR-REG-001"}	873156ba42227ac2de549a4d1d3898c5dfaab51820e4eb982213d09d07c27a7a	9c14f9f2b6ec9e9fc3e0eafce9837511c2f702933c0e8f1a993c6f67aa42cac3	2025-07-05 22:09:49.184	\N	MUSEBAR-REG-001	2025-07-05 22:09:49.184877
46	46	SALE	45	12.00	2.00	card	{"items": [{"id": 106, "order_id": 45, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:11:16.976Z", "product_id": 57, "tax_amount": "0.75", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 107, "order_id": 45, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:11:16.984Z", "product_id": 37, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 45, "timestamp": "2025-07-05T20:11:16.972Z", "register_id": "MUSEBAR-REG-001"}	9c14f9f2b6ec9e9fc3e0eafce9837511c2f702933c0e8f1a993c6f67aa42cac3	4f9ae38d9cf32b07084596779dd275930c4a5ac80c54035c92f82f0fcd034c9f	2025-07-05 22:11:16.993	\N	MUSEBAR-REG-001	2025-07-05 22:11:16.993939
47	47	SALE	46	12.00	2.00	card	{"items": [{"id": 108, "order_id": 46, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:11:53.953Z", "product_id": 57, "tax_amount": "0.75", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 109, "order_id": 46, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:11:53.966Z", "product_id": 39, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 46, "timestamp": "2025-07-05T20:11:53.941Z", "register_id": "MUSEBAR-REG-001"}	4f9ae38d9cf32b07084596779dd275930c4a5ac80c54035c92f82f0fcd034c9f	a82ce5a1137b2405ffbcce74c54aeb8163711dcc4dc57ad61a47e1d64348e102	2025-07-05 22:11:53.972	\N	MUSEBAR-REG-001	2025-07-05 22:11:53.973002
48	48	SALE	47	24.00	4.00	card	{"items": [{"id": 110, "order_id": 47, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:12:44.153Z", "product_id": 64, "tax_amount": "1.33", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 111, "order_id": 47, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:12:44.159Z", "product_id": 64, "tax_amount": "1.33", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 112, "order_id": 47, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:12:44.174Z", "product_id": 64, "tax_amount": "1.33", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 47, "timestamp": "2025-07-05T20:12:44.141Z", "register_id": "MUSEBAR-REG-001"}	a82ce5a1137b2405ffbcce74c54aeb8163711dcc4dc57ad61a47e1d64348e102	5a20dd5d1d29daa168186bf3a61f81644b98a95e6db9ac65bf7ffc46670310ca	2025-07-05 22:12:44.18	\N	MUSEBAR-REG-001	2025-07-05 22:12:44.180553
49	49	SALE	48	8.00	1.33	card	{"items": [{"id": 113, "order_id": 48, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:17:23.264Z", "product_id": 64, "tax_amount": "1.33", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 48, "timestamp": "2025-07-05T20:17:23.259Z", "register_id": "MUSEBAR-REG-001"}	5a20dd5d1d29daa168186bf3a61f81644b98a95e6db9ac65bf7ffc46670310ca	f1037e8ac071b9a17ba935e5824b93783bd660d159d71c51a969189908427069	2025-07-05 22:17:23.271	\N	MUSEBAR-REG-001	2025-07-05 22:17:23.271478
50	50	SALE	49	46.50	5.74	split	{"items": [{"id": 114, "order_id": 49, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:28:11.081Z", "product_id": 65, "tax_amount": "1.33", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Cocktail du moment", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 115, "order_id": 49, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:28:11.111Z", "product_id": 46, "tax_amount": "1.00", "unit_price": "6.00", "sub_bill_id": null, "total_price": "6.00", "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 116, "order_id": 49, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:28:11.114Z", "product_id": 46, "tax_amount": "1.00", "unit_price": "6.00", "sub_bill_id": null, "total_price": "6.00", "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 117, "order_id": 49, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T20:28:11.118Z", "product_id": 43, "tax_amount": "0.50", "unit_price": "5.50", "sub_bill_id": null, "total_price": "5.50", "product_name": "Dry Quiri", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 118, "order_id": 49, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T20:28:11.122Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 49, "timestamp": "2025-07-05T20:28:11.069Z", "register_id": "MUSEBAR-REG-001"}	f1037e8ac071b9a17ba935e5824b93783bd660d159d71c51a969189908427069	04b83acf4a2f9a113cd10d89f13e8fced78a94fb137d47fea68d0287192f579a	2025-07-05 22:28:11.126	\N	MUSEBAR-REG-001	2025-07-05 22:28:11.12739
51	51	SALE	50	21.00	2.25	card	{"items": [{"id": 119, "order_id": 50, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T20:28:46.385Z", "product_id": 76, "tax_amount": "0.50", "unit_price": "5.50", "sub_bill_id": null, "total_price": "5.50", "product_name": "Citronnade", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 120, "order_id": 50, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T20:28:46.390Z", "product_id": 43, "tax_amount": "0.50", "unit_price": "5.50", "sub_bill_id": null, "total_price": "5.50", "product_name": "Dry Quiri", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 121, "order_id": 50, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:28:46.394Z", "product_id": 49, "tax_amount": "0.75", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 122, "order_id": 50, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T20:28:46.397Z", "product_id": 44, "tax_amount": "0.50", "unit_price": "5.50", "sub_bill_id": null, "total_price": "5.50", "product_name": "Bissap", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 50, "timestamp": "2025-07-05T20:28:46.373Z", "register_id": "MUSEBAR-REG-001"}	04b83acf4a2f9a113cd10d89f13e8fced78a94fb137d47fea68d0287192f579a	4efb7162add050bd5632232d7d3bc814413acd6fc123e56e5e30d158cd27b160	2025-07-05 22:28:46.402	\N	MUSEBAR-REG-001	2025-07-05 22:28:46.403461
52	52	SALE	51	21.00	1.91	card	{"items": [{"id": 123, "order_id": 51, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-05T20:29:43.285Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 51, "timestamp": "2025-07-05T20:29:43.280Z", "register_id": "MUSEBAR-REG-001"}	4efb7162add050bd5632232d7d3bc814413acd6fc123e56e5e30d158cd27b160	c82125640bbf8f9dc0cf12b9dde17733fad626c9905dd244d04d7ac5f6c542a5	2025-07-05 22:29:43.294	\N	MUSEBAR-REG-001	2025-07-05 22:29:43.295042
53	53	SALE	52	15.50	2.58	card	{"items": [{"id": 124, "order_id": 52, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:39:00.118Z", "product_id": 89, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Uby 4", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 125, "order_id": 52, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:39:00.124Z", "product_id": 50, "tax_amount": "0.75", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 126, "order_id": 52, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:39:00.128Z", "product_id": 51, "tax_amount": "0.75", "unit_price": "4.50", "sub_bill_id": null, "total_price": "4.50", "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 52, "timestamp": "2025-07-05T20:39:00.107Z", "register_id": "MUSEBAR-REG-001"}	c82125640bbf8f9dc0cf12b9dde17733fad626c9905dd244d04d7ac5f6c542a5	c5073a40c251bf11903881371300d9079dad030e9b83285f3166afd16bdc03dc	2025-07-05 22:39:00.133	\N	MUSEBAR-REG-001	2025-07-05 22:39:00.133948
54	54	SALE	53	7.50	1.25	card	{"items": [{"id": 127, "order_id": 53, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T20:59:52.202Z", "product_id": 37, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 53, "timestamp": "2025-07-05T20:59:52.189Z", "register_id": "MUSEBAR-REG-001"}	c5073a40c251bf11903881371300d9079dad030e9b83285f3166afd16bdc03dc	0402d61c9a63e33af124292b4fd9be154c1437e272f99a4754186157de072d4c	2025-07-05 22:59:52.214	\N	MUSEBAR-REG-001	2025-07-05 22:59:52.214814
55	55	SALE	54	7.50	1.25	card	{"items": [{"id": 128, "order_id": 54, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-05T21:29:51.132Z", "product_id": 37, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 54, "timestamp": "2025-07-05T21:29:51.120Z", "register_id": "MUSEBAR-REG-001"}	0402d61c9a63e33af124292b4fd9be154c1437e272f99a4754186157de072d4c	8ff791edd85e36e6a74afbf19c43ad69b077b1496d28f16f0ec377bae8d9f3c6	2025-07-05 23:29:51.156	\N	MUSEBAR-REG-001	2025-07-05 23:29:51.156795
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price, tax_rate, tax_amount, happy_hour_applied, happy_hour_discount_amount, sub_bill_id, created_at) FROM stdin;
1	1	40	Triple	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 17:15:08.335594
2	2	41	Blanche	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 17:15:21.783607
3	2	42	Spritz Sureau	1	7.00	7.00	20.00	1.17	t	1.75	\N	2025-07-05 17:15:21.788694
4	3	44	Bissap	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 17:22:25.840865
5	3	43	Dry Quiri	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 17:22:25.855278
6	4	39	IPA	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 17:23:06.002881
7	4	45	Ginger	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 17:23:06.008332
8	5	47	Blonde de Soif	1	3.50	3.50	20.00	0.58	f	0.00	\N	2025-07-05 17:41:47.188108
9	5	60	Coca	1	3.00	3.00	10.00	0.27	t	0.75	\N	2025-07-05 17:41:47.198803
10	6	77	Sirop	1	2.00	2.00	10.00	0.18	f	0.00	\N	2025-07-05 17:53:54.652627
11	6	51	Triple	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 17:53:54.659368
12	6	76	Citronnade	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 17:53:54.663525
13	7	39	IPA	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 17:55:33.870552
14	7	46	Blonde de Soif	1	5.00	5.00	20.00	0.83	t	1.25	\N	2025-07-05 17:55:33.89057
15	8	76	Citronnade	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 18:30:42.50608
16	8	44	Bissap	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 18:30:42.525047
17	9	47	Blonde de Soif	1	3.50	3.50	20.00	0.58	f	0.00	\N	2025-07-05 18:36:03.611643
18	10	44	Bissap	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 18:45:06.385723
19	10	73	Jus de Pomme Pétillant	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 18:45:06.391261
20	10	76	Citronnade	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 18:45:06.39567
21	10	44	Bissap	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 18:45:06.399998
22	10	66	Caïpi	1	6.00	6.00	20.00	1.00	t	1.50	\N	2025-07-05 18:45:06.404077
23	10	66	Caïpi	1	6.00	6.00	20.00	1.00	t	1.50	\N	2025-07-05 18:45:06.407987
24	10	65	Cocktail du moment	1	7.00	7.00	20.00	1.17	t	1.75	\N	2025-07-05 18:45:06.41236
25	11	39	IPA	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 18:49:00.049573
26	11	39	IPA	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 18:49:00.067345
27	11	46	Blonde de Soif	1	5.00	5.00	20.00	0.83	t	1.25	\N	2025-07-05 18:49:00.071189
28	12	40	Triple	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 18:57:28.088117
29	13	105	Saucisson	1	6.50	6.50	10.00	0.59	f	0.00	\N	2025-07-05 18:59:51.514581
30	13	65	Cocktail du moment	1	7.00	7.00	20.00	1.17	t	1.75	\N	2025-07-05 18:59:51.51952
31	13	40	Triple	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 18:59:51.524789
32	14	52	NEIPA	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 19:00:13.924375
33	14	52	NEIPA	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 19:00:13.937742
34	15	53	NEIPA	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 19:08:33.347763
35	15	47	Blonde de Soif	1	3.50	3.50	20.00	0.58	f	0.00	\N	2025-07-05 19:08:33.372654
36	15	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-05 19:08:33.380178
37	15	68	Espresso Martini	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 19:08:33.383559
38	15	85	Chardo	1	5.50	5.50	20.00	0.92	f	0.00	\N	2025-07-05 19:08:33.386846
39	16	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:20:46.072337
40	16	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:20:46.082836
41	16	43	Dry Quiri	1	5.50	5.50	10.00	0.50	f	0.00	\N	2025-07-05 19:20:46.089559
42	16	57	Bière du Moment	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 19:20:46.093161
43	17	104	Focaccia 	1	8.00	8.00	10.00	0.73	f	0.00	\N	2025-07-05 19:21:05.227462
44	18	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:23:12.05007
45	18	40	Triple	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:23:12.069438
46	18	61	Spritz Apérol	1	7.00	7.00	20.00	1.17	f	0.00	\N	2025-07-05 19:23:12.072386
47	19	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:37:57.258382
48	19	40	Triple	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:37:57.267317
49	20	64	Amaretto Stormy	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 19:41:26.171458
50	20	74	London Mule	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 19:41:26.176423
51	21	66	Caïpi	1	7.00	7.00	20.00	1.17	f	0.00	\N	2025-07-05 19:48:01.076067
52	21	64	Amaretto Stormy	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 19:48:01.082174
53	22	56	Bière du Moment	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:51:10.475234
54	22	56	Bière du Moment	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:51:10.483424
55	23	104	Focaccia 	1	8.00	8.00	10.00	0.73	f	0.00	\N	2025-07-05 19:58:32.636462
56	23	40	Triple	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:58:32.64189
57	23	95	Americano	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-05 19:58:32.645422
58	24	49	IPA	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 20:01:48.575829
59	25	39	IPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:07:17.532538
60	25	56	Bière du Moment	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:07:17.550876
61	26	53	NEIPA	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 20:07:55.457765
62	27	39	IPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:09:52.57666
63	28	52	NEIPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:24:33.957905
64	28	85	Chardo	1	5.50	5.50	20.00	0.92	f	0.00	\N	2025-07-05 20:24:33.96441
65	29	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:28:08.255352
66	29	61	Spritz Apérol	1	7.00	7.00	20.00	1.17	f	0.00	\N	2025-07-05 20:28:08.260686
67	30	95	Americano	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-05 20:28:40.604211
68	30	40	Triple	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:28:40.610006
69	31	40	Triple	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:31:15.367611
70	31	39	IPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:31:15.372511
71	32	50	Romarin	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 20:31:26.253575
72	32	55	Rouge	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 20:31:26.258665
73	33	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:34:06.532635
74	34	87	Uby 3	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-05 20:35:14.032185
75	35	39	IPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:36:59.733376
76	35	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:36:59.7387
77	35	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:36:59.742498
78	35	39	IPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:36:59.746487
79	35	47	Blonde de Soif	1	3.50	3.50	20.00	0.58	f	0.00	\N	2025-07-05 20:36:59.752322
80	35	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-05 20:36:59.755865
81	36	107	Ti Punch	1	7.00	7.00	20.00	1.17	f	0.00	\N	2025-07-05 20:51:24.172486
82	36	40	Triple	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:51:24.178079
83	37	106	Blanche	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 21:07:16.554381
84	38	106	Blanche	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 21:10:21.269648
85	38	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 21:10:21.275024
86	38	40	Triple	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 21:10:21.279194
87	38	73	Jus de Pomme Pétillant	1	5.50	5.50	10.00	0.50	f	0.00	\N	2025-07-05 21:10:21.283245
88	38	73	Jus de Pomme Pétillant	1	5.50	5.50	10.00	0.50	f	0.00	\N	2025-07-05 21:10:21.287813
89	38	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-05 21:10:21.291827
90	38	105	Saucisson	1	6.50	6.50	10.00	0.59	f	0.00	\N	2025-07-05 21:10:21.29534
91	39	58	Picon	1	7.00	7.00	20.00	1.17	f	0.00	\N	2025-07-05 21:28:30.937705
92	39	46	Blonde de Soif	1	6.00	6.00	20.00	1.00	f	0.00	\N	2025-07-05 21:28:30.94389
93	39	52	NEIPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 21:28:30.947773
94	39	81	CDR	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-05 21:28:30.951503
95	39	104	Focaccia 	1	8.00	8.00	10.00	0.73	f	0.00	\N	2025-07-05 21:28:30.954878
96	40	83	Blaye	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-05 21:30:46.469663
97	40	85	Chardo	1	5.50	5.50	20.00	0.92	f	0.00	\N	2025-07-05 21:30:46.479602
98	41	51	Triple	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 21:32:05.647345
99	42	51	Triple	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 21:35:43.135705
100	42	104	Focaccia 	1	8.00	8.00	10.00	0.73	f	0.00	\N	2025-07-05 21:35:43.141568
101	42	104	Focaccia 	1	8.00	8.00	10.00	0.73	f	0.00	\N	2025-07-05 21:35:43.145515
102	42	81	CDR	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-05 21:35:43.149169
103	42	89	Uby 4	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-05 21:35:43.153199
104	43	64	Amaretto Stormy	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 21:42:55.36078
105	44	39	IPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 22:09:49.177353
106	45	57	Bière du Moment	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 22:11:16.976944
107	45	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 22:11:16.984
108	46	57	Bière du Moment	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 22:11:53.953318
109	46	39	IPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 22:11:53.966163
110	47	64	Amaretto Stormy	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 22:12:44.153501
111	47	64	Amaretto Stormy	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 22:12:44.159115
112	47	64	Amaretto Stormy	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 22:12:44.174459
113	48	64	Amaretto Stormy	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 22:17:23.264076
114	49	65	Cocktail du moment	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 22:28:11.081081
115	49	46	Blonde de Soif	1	6.00	6.00	20.00	1.00	f	0.00	\N	2025-07-05 22:28:11.111272
116	49	46	Blonde de Soif	1	6.00	6.00	20.00	1.00	f	0.00	\N	2025-07-05 22:28:11.114958
117	49	43	Dry Quiri	1	5.50	5.50	10.00	0.50	f	0.00	\N	2025-07-05 22:28:11.118731
118	49	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-05 22:28:11.122137
119	50	76	Citronnade	1	5.50	5.50	10.00	0.50	f	0.00	\N	2025-07-05 22:28:46.385316
120	50	43	Dry Quiri	1	5.50	5.50	10.00	0.50	f	0.00	\N	2025-07-05 22:28:46.39036
121	50	49	IPA	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 22:28:46.394168
122	50	44	Bissap	1	5.50	5.50	10.00	0.50	f	0.00	\N	2025-07-05 22:28:46.397832
123	51	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-05 22:29:43.285425
124	52	89	Uby 4	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-05 22:39:00.118886
125	52	50	Romarin	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 22:39:00.12418
126	52	51	Triple	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 22:39:00.128154
127	53	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 22:59:52.202217
128	54	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 23:29:51.132934
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, total_amount, total_tax, payment_method, status, notes, created_at, updated_at, tips, change) FROM stdin;
1	6.50	1.08	card	completed	Paiement par carte: 6.50€	2025-07-05 17:15:08.322904	2025-07-05 17:15:08.322904	0	0
2	13.50	2.25	card	completed	Paiement par carte: 13.50€	2025-07-05 17:15:21.771349	2025-07-05 17:15:21.771349	0	0
3	9.00	0.82	card	completed	Paiement par carte: 9.00€	2025-07-05 17:22:25.828237	2025-07-05 17:22:25.828237	0	0
4	11.00	1.49	card	completed	Paiement par carte: 11.00€	2025-07-05 17:23:05.998489	2025-07-05 17:23:05.998489	0	0
5	6.50	0.86	card	completed	Paiement par carte: 6.50€	2025-07-05 17:41:47.175759	2025-07-05 17:41:47.175759	0	0
6	11.00	1.34	card	completed	Paiement par carte: 11.00€	2025-07-05 17:53:54.639795	2025-07-05 17:53:54.639795	0	0
7	11.50	1.92	card	completed	Paiement par carte: 11.50€	2025-07-05 17:55:33.866468	2025-07-05 17:55:33.866468	0	0
8	9.00	0.82	cash	completed	Paiement: 9.00€, Rendu: 0.00€	2025-07-05 18:30:42.494585	2025-07-05 18:30:42.494585	0	0
9	3.50	0.58	card	completed	Paiement par carte: 3.50€	2025-07-05 18:36:03.598655	2025-07-05 18:36:03.598655	0	0
10	37.00	4.80	card	completed	Paiement par carte: 37.00€	2025-07-05 18:45:06.373125	2025-07-05 18:45:06.373125	0	0
11	18.00	3.00	split	completed	Split par items - 3 parts: Part 1: Espèces 6.50€, Part 2: Carte 5.00€, Part 3: Carte 6.50€	2025-07-05 18:49:00.037891	2025-07-05 18:49:00.037891	0	0
12	6.50	1.08	card	completed	Paiement par carte: 6.50€	2025-07-05 18:57:28.076008	2025-07-05 18:57:28.076008	0	0
13	20.00	2.84	card	completed	Paiement par carte: 20.00€	2025-07-05 18:59:51.509512	2025-07-05 18:59:51.509512	0	0
14	13.00	2.17	card	completed	Paiement par carte: 13.00€	2025-07-05 19:00:13.921319	2025-07-05 19:00:13.921319	0	0
15	42.50	5.49	card	completed	Paiement par carte: 42.50€	2025-07-05 19:08:33.336488	2025-07-05 19:08:33.336488	0	0
16	25.00	3.75	card	completed	Paiement par carte: 25.00€	2025-07-05 19:20:46.060704	2025-07-05 19:20:46.060704	0	0
17	8.00	0.73	card	completed	Paiement par carte: 8.00€	2025-07-05 19:21:05.216051	2025-07-05 19:21:05.216051	0	0
18	22.00	3.67	split	completed	Split par items - 3 parts: Part 1: Carte 7.50€, Part 2: Carte 7.00€, Part 3: Carte 7.50€	2025-07-05 19:23:12.038425	2025-07-05 19:23:12.038425	0	0
19	15.00	2.50	card	completed	Paiement par carte: 15.00€	2025-07-05 19:37:57.254131	2025-07-05 19:37:57.254131	0	0
20	16.00	2.67	card	completed	Paiement par carte: 16.00€	2025-07-05 19:41:26.159826	2025-07-05 19:41:26.159826	0	0
21	15.00	2.50	card	completed	Paiement par carte: 15.00€	2025-07-05 19:48:01.063919	2025-07-05 19:48:01.063919	0	0
22	15.00	2.50	card	completed	Paiement par carte: 15.00€	2025-07-05 19:51:10.462937	2025-07-05 19:51:10.462937	0	0
23	22.00	3.06	card	completed	Paiement par carte: 22.00€	2025-07-05 19:58:32.631205	2025-07-05 19:58:32.631205	0	0
24	4.50	0.75	card	completed	Paiement par carte: 4.50€	2025-07-05 20:01:48.563746	2025-07-05 20:01:48.563746	0	0
25	15.00	2.50	split	completed	Split par items - 2 parts: Part 1: Carte 7.50€, Part 2: Espèces 7.50€	2025-07-05 20:07:17.520558	2025-07-05 20:07:17.520558	0	0
26	4.50	0.75	card	completed	Paiement par carte: 4.50€	2025-07-05 20:07:55.439047	2025-07-05 20:07:55.439047	0	0
27	7.50	1.25	card	completed	Paiement par carte: 7.50€	2025-07-05 20:09:52.564813	2025-07-05 20:09:52.564813	0	0
28	13.00	2.17	card	completed	Paiement par carte: 13.00€	2025-07-05 20:24:33.944915	2025-07-05 20:24:33.944915	0	0
29	14.50	2.42	card	completed	Paiement par carte: 14.50€	2025-07-05 20:28:08.243095	2025-07-05 20:28:08.243095	0	0
30	14.00	2.33	card	completed	Paiement par carte: 14.00€	2025-07-05 20:28:40.591921	2025-07-05 20:28:40.591921	0	0
31	15.00	2.50	cash	completed	Paiement: 15.00€, Rendu: 0.00€	2025-07-05 20:31:15.363665	2025-07-05 20:31:15.363665	0	0
32	9.00	1.50	card	completed	Paiement par carte: 9.00€	2025-07-05 20:31:26.249408	2025-07-05 20:31:26.249408	0	0
33	7.50	1.25	card	completed	Paiement par carte: 7.50€	2025-07-05 20:34:06.521876	2025-07-05 20:34:06.521876	0	0
34	6.50	1.08	card	completed	Paiement par carte: 6.50€	2025-07-05 20:35:14.02038	2025-07-05 20:35:14.02038	0	0
35	54.50	7.49	card	completed	Paiement par carte: 54.50€	2025-07-05 20:36:59.721984	2025-07-05 20:36:59.721984	0	0
36	14.50	2.42	card	completed	Paiement par carte: 14.50€	2025-07-05 20:51:24.15964	2025-07-05 20:51:24.15964	0	0
37	7.50	1.25	card	completed	Paiement par carte: 7.50€	2025-07-05 21:07:16.542815	2025-07-05 21:07:16.542815	0	0
38	61.00	7.25	card	completed	Paiement par carte: 61.00€	2025-07-05 21:10:21.257914	2025-07-05 21:10:21.257914	0	0
39	35.00	5.23	card	completed	Paiement par carte: 35.00€	2025-07-05 21:28:30.925317	2025-07-05 21:28:30.925317	0	0
40	12.00	2.00	card	completed	Paiement par carte: 12.00€	2025-07-05 21:30:46.457928	2025-07-05 21:30:46.457928	0	0
41	4.50	0.75	card	completed	Paiement par carte: 4.50€	2025-07-05 21:32:05.63599	2025-07-05 21:32:05.63599	0	0
42	33.50	4.37	split	completed	Split par items - 2 parts: Part 1: Carte 13.00€, Part 2: Carte 20.50€	2025-07-05 21:35:43.124169	2025-07-05 21:35:43.124169	0	0
43	8.00	1.33	card	completed	Paiement par carte: 8.00€	2025-07-05 21:42:55.348297	2025-07-05 21:42:55.348297	0	0
44	7.50	1.25	card	completed	Paiement par carte: 7.50€	2025-07-05 22:09:49.16486	2025-07-05 22:09:49.16486	0	0
45	12.00	2.00	card	completed	Paiement par carte: 12.00€	2025-07-05 22:11:16.972987	2025-07-05 22:11:16.972987	0	0
46	12.00	2.00	card	completed	Paiement par carte: 12.00€	2025-07-05 22:11:53.941149	2025-07-05 22:11:53.941149	0	0
47	24.00	4.00	card	completed	Paiement par carte: 24.00€	2025-07-05 22:12:44.141796	2025-07-05 22:12:44.141796	0	0
48	8.00	1.33	card	completed	Paiement par carte: 8.00€	2025-07-05 22:17:23.259621	2025-07-05 22:17:23.259621	0	0
49	46.50	5.74	split	completed	Split égal - 2 parts: Part 1: Carte 23.25€, Part 2: Carte 23.25€	2025-07-05 22:28:11.06943	2025-07-05 22:28:11.06943	0	0
50	21.00	2.25	card	completed	Paiement par carte: 21.00€	2025-07-05 22:28:46.373211	2025-07-05 22:28:46.373211	0	0
51	21.00	1.91	card	completed	Paiement par carte: 21.00€	2025-07-05 22:29:43.280554	2025-07-05 22:29:43.280554	0	0
52	15.50	2.58	card	completed	Paiement par carte: 15.50€	2025-07-05 22:39:00.107599	2025-07-05 22:39:00.107599	0	0
53	7.50	1.25	card	completed	Paiement par carte: 7.50€	2025-07-05 22:59:52.189985	2025-07-05 22:59:52.189985	0	0
54	7.50	1.25	card	completed	Paiement par carte: 7.50€	2025-07-05 23:29:51.120314	2025-07-05 23:29:51.120314	0	0
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, name) FROM stdin;
1	access_pos
2	access_menu
3	access_happy_hour
4	access_history
5	access_settings
6	access_compliance
7	pos_access
8	menu_management
9	user_management
10	legal_compliance
11	audit_trail
12	closure_bulletins
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, price, tax_rate, category_id, happy_hour_discount_percent, happy_hour_discount_fixed, is_happy_hour_eligible, created_at, updated_at, is_active) FROM stdin;
66	Caïpi	7.00	20.00	28	0.00	\N	t	2025-07-05 17:44:54.991861	2025-07-05 17:44:54.991861	t
67	Caïpi liqueur	8.00	20.00	28	0.00	\N	t	2025-07-05 17:45:13.338285	2025-07-05 17:45:13.338285	t
68	Espresso Martini	8.00	20.00	28	0.00	\N	t	2025-07-05 17:45:37.893133	2025-07-05 17:45:37.893133	t
69	Gin To	8.00	20.00	28	0.00	\N	t	2025-07-05 17:45:53.481607	2025-07-05 17:45:53.481607	t
70	Gin To liqueur	9.00	20.00	28	0.00	\N	t	2025-07-05 17:46:10.993721	2025-07-05 17:46:10.993721	t
71	Bramble Star	8.00	20.00	28	0.00	\N	t	2025-07-05 17:48:10.020345	2025-07-05 17:48:10.020345	t
72	Moscow Mule	8.00	20.00	28	0.00	\N	t	2025-07-05 17:48:43.524926	2025-07-05 17:48:43.524926	t
73	Jus de Pomme Pétillant	5.50	10.00	30	0.00	\N	t	2025-07-05 17:50:21.545599	2025-07-05 17:50:21.545599	t
40	Triple	7.50	20.00	26	0.00	\N	t	2025-07-05 16:40:04.295428	2025-07-05 16:40:04.295428	t
39	IPA	7.50	20.00	26	0.00	\N	t	2025-07-04 14:04:06.677213	2025-07-05 16:40:20.936411	t
37	Romarin	7.50	20.00	26	0.00	\N	t	2025-07-04 13:37:32.793659	2025-07-05 16:40:51.402344	t
42	Spritz Sureau	8.00	20.00	28	0.00	\N	t	2025-07-05 16:41:51.285278	2025-07-05 16:41:51.285278	t
43	Dry Quiri	5.50	10.00	29	0.00	\N	t	2025-07-05 17:20:07.101582	2025-07-05 17:20:07.101582	t
44	Bissap	5.50	10.00	30	0.00	\N	t	2025-07-05 17:21:01.052748	2025-07-05 17:21:01.052748	t
45	Ginger	5.50	10.00	30	0.00	\N	t	2025-07-05 17:21:50.767296	2025-07-05 17:21:50.767296	t
46	Blonde de Soif	6.00	20.00	26	0.00	\N	t	2025-07-05 17:33:48.511586	2025-07-05 17:34:23.593765	t
47	Blonde de Soif	3.50	20.00	26	0.00	\N	f	2025-07-05 17:34:10.745518	2025-07-05 17:34:31.210502	t
48	Blanche	4.50	20.00	26	0.00	\N	f	2025-07-05 17:34:49.113741	2025-07-05 17:34:49.113741	t
49	IPA	4.50	20.00	26	0.00	\N	f	2025-07-05 17:35:09.70349	2025-07-05 17:35:09.70349	t
50	Romarin	4.50	20.00	26	0.00	\N	f	2025-07-05 17:35:28.675804	2025-07-05 17:35:28.675804	t
51	Triple	4.50	20.00	26	0.00	\N	f	2025-07-05 17:35:55.937689	2025-07-05 17:35:55.937689	t
52	NEIPA	7.50	20.00	26	0.00	\N	t	2025-07-05 17:36:26.851386	2025-07-05 17:36:26.851386	t
53	NEIPA	4.50	20.00	26	0.00	\N	f	2025-07-05 17:36:43.558911	2025-07-05 17:36:43.558911	t
54	Rouge	7.50	20.00	26	0.00	\N	t	2025-07-05 17:37:16.933034	2025-07-05 17:37:16.933034	t
55	Rouge	4.50	20.00	26	0.00	\N	f	2025-07-05 17:37:32.048082	2025-07-05 17:37:32.048082	t
56	Bière du Moment	7.50	20.00	26	0.00	\N	t	2025-07-05 17:38:29.362984	2025-07-05 17:38:29.362984	t
57	Bière du Moment	4.50	20.00	26	0.00	\N	f	2025-07-05 17:39:15.217379	2025-07-05 17:39:15.217379	t
59	Picon	4.50	20.00	26	0.00	\N	f	2025-07-05 17:40:32.912803	2025-07-05 17:40:32.912803	t
58	Picon	7.00	20.00	26	0.00	\N	t	2025-07-05 17:40:09.677716	2025-07-05 17:40:46.620517	t
60	Coca	4.00	10.00	30	0.00	\N	t	2025-07-05 17:41:27.785433	2025-07-05 17:41:27.785433	t
61	Spritz Apérol	7.00	20.00	28	0.00	\N	t	2025-07-05 17:42:11.489365	2025-07-05 17:42:11.489365	t
62	Spritz Campari	8.00	20.00	28	0.00	\N	t	2025-07-05 17:42:29.49871	2025-07-05 17:42:29.49871	t
63	Spritz Limoncello	8.00	20.00	28	0.00	\N	t	2025-07-05 17:43:15.197776	2025-07-05 17:43:15.197776	t
64	Amaretto Stormy	8.00	20.00	28	0.00	\N	t	2025-07-05 17:43:55.598681	2025-07-05 17:43:55.598681	t
65	Cocktail du moment	8.00	20.00	28	0.00	\N	t	2025-07-05 17:44:14.222648	2025-07-05 17:44:14.222648	t
74	London Mule	8.00	20.00	28	0.00	\N	t	2025-07-05 17:50:53.922987	2025-07-05 17:50:53.922987	t
75	Jamaïcan Mule	8.00	20.00	28	0.00	\N	t	2025-07-05 17:52:19.129625	2025-07-05 17:52:19.129625	t
76	Citronnade	5.50	10.00	29	0.00	\N	t	2025-07-05 17:52:45.901679	2025-07-05 17:52:45.901679	t
77	Sirop	2.00	10.00	30	0.00	\N	f	2025-07-05 17:53:17.422606	2025-07-05 17:53:17.422606	t
78	Whiskey Coca	8.00	20.00	28	0.00	\N	t	2025-07-05 17:56:27.440126	2025-07-05 17:56:27.440126	t
79	Whiskey Coca double	10.00	20.00	28	0.00	\N	f	2025-07-05 17:56:54.58924	2025-07-05 17:56:54.58924	t
80	Cuba Libre	8.00	20.00	28	0.00	\N	t	2025-07-05 17:57:12.037084	2025-07-05 17:57:12.037084	t
81	CDR	6.50	20.00	31	0.00	\N	t	2025-07-05 17:58:00.45396	2025-07-05 17:58:00.45396	t
82	CDR	25.00	20.00	31	0.00	\N	f	2025-07-05 17:58:19.95929	2025-07-05 17:58:19.95929	t
83	Blaye	6.50	20.00	31	0.00	\N	t	2025-07-05 17:58:56.950461	2025-07-05 17:58:56.950461	t
84	Blaye	25.00	20.00	31	0.00	\N	f	2025-07-05 17:59:17.273058	2025-07-05 17:59:17.273058	t
85	Chardo	5.50	20.00	31	0.00	\N	t	2025-07-05 17:59:35.060231	2025-07-05 17:59:35.060231	t
86	Chardo	23.00	20.00	31	0.00	\N	f	2025-07-05 18:00:03.594406	2025-07-05 18:00:03.594406	t
87	Uby 3	6.50	20.00	31	0.00	\N	t	2025-07-05 18:00:28.606889	2025-07-05 18:00:28.606889	t
88	Uby 3	25.00	20.00	31	0.00	\N	f	2025-07-05 18:00:48.102336	2025-07-05 18:00:48.102336	t
89	Uby 4	6.50	20.00	31	0.00	\N	t	2025-07-05 18:01:12.863927	2025-07-05 18:01:12.863927	t
90	Uby 4	25.00	20.00	31	0.00	\N	f	2025-07-05 18:01:40.446388	2025-07-05 18:01:40.446388	t
91	Negroni	8.00	20.00	28	0.00	\N	t	2025-07-05 18:02:44.568755	2025-07-05 18:02:44.568755	t
92	Proscecco	5.50	20.00	31	0.00	\N	t	2025-07-05 18:03:21.589189	2025-07-05 18:03:21.589189	t
93	Pastis	4.00	20.00	32	0.00	\N	t	2025-07-05 18:03:36.682084	2025-07-05 18:03:36.682084	t
94	Bellini	6.50	20.00	32	0.00	\N	t	2025-07-05 18:04:24.678528	2025-07-05 18:04:24.678528	t
96	Menthe Pastille/Get	6.50	20.00	32	0.00	\N	t	2025-07-05 18:04:55.82583	2025-07-05 18:04:55.82583	t
97	Baileys	6.50	20.00	32	0.00	\N	t	2025-07-05 18:05:11.83256	2025-07-05 18:05:11.83256	t
95	Americano	6.50	20.00	32	0.00	\N	t	2025-07-05 18:04:37.528722	2025-07-05 18:05:39.505887	t
98	Café	2.00	10.00	30	0.00	\N	f	2025-07-05 18:05:59.787129	2025-07-05 18:05:59.787129	t
99	Jus de Fruit	4.00	10.00	30	0.00	\N	t	2025-07-05 18:06:24.504586	2025-07-05 18:06:24.504586	t
100	IPA Sans Alcool	5.50	10.00	30	0.00	\N	t	2025-07-05 18:08:25.585724	2025-07-05 18:08:25.585724	t
101	Bière Sirop	7.00	20.00	26	0.00	\N	t	2025-07-05 18:09:36.718955	2025-07-05 18:09:55.523017	t
102	Bière Sirop	4.50	20.00	26	0.00	\N	f	2025-07-05 18:10:39.529006	2025-07-05 18:10:39.529006	t
103	Planche	21.00	10.00	33	0.00	\N	f	2025-07-05 18:11:28.594914	2025-07-05 18:11:28.594914	t
104	Focaccia 	8.00	10.00	33	0.00	\N	f	2025-07-05 18:11:47.653992	2025-07-05 18:11:47.653992	t
105	Saucisson	6.50	10.00	33	0.00	\N	f	2025-07-05 18:12:06.341497	2025-07-05 18:12:06.341497	t
41	Blanche	7.50	20.00	26	0.00	\N	t	2025-07-05 16:41:21.685583	2025-07-05 18:13:43.929924	f
106	Blanche	7.50	20.00	26	0.00	\N	t	2025-07-05 20:37:33.952486	2025-07-05 20:37:33.952486	t
107	Ti Punch	7.00	20.00	28	0.00	\N	t	2025-07-05 20:50:48.544906	2025-07-05 20:50:48.544906	t
\.


--
-- Data for Name: sub_bills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sub_bills (id, order_id, payment_method, amount, status, created_at) FROM stdin;
\.


--
-- Data for Name: user_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_permissions (user_id, permission_id) FROM stdin;
1	1
1	2
1	3
1	4
1	5
1	6
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, is_admin, created_at) FROM stdin;
1	elliot.vergne@gmail.com	$2b$12$5mAJ5bPkIWDS5yOplk8tIeoSve1P8SpU9hYozdDB5C/Hnn1JUM4VK	t	2025-07-03 16:46:25.850559
\.


--
-- Name: archive_exports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.archive_exports_id_seq', 1, false);


--
-- Name: audit_trail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_trail_id_seq', 177, true);


--
-- Name: business_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_settings_id_seq', 2, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 38, true);


--
-- Name: closure_bulletins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.closure_bulletins_id_seq', 5, true);


--
-- Name: closure_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.closure_settings_id_seq', 42, true);


--
-- Name: legal_journal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.legal_journal_id_seq', 70, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 155, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 69, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 12, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 114, true);


--
-- Name: sub_bills_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sub_bills_id_seq', 10, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: archive_exports archive_exports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.archive_exports
    ADD CONSTRAINT archive_exports_pkey PRIMARY KEY (id);


--
-- Name: audit_trail audit_trail_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_trail
    ADD CONSTRAINT audit_trail_pkey PRIMARY KEY (id);


--
-- Name: business_settings business_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_settings
    ADD CONSTRAINT business_settings_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: closure_bulletins closure_bulletins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.closure_bulletins
    ADD CONSTRAINT closure_bulletins_pkey PRIMARY KEY (id);


--
-- Name: closure_settings closure_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.closure_settings
    ADD CONSTRAINT closure_settings_pkey PRIMARY KEY (id);


--
-- Name: closure_settings closure_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.closure_settings
    ADD CONSTRAINT closure_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: legal_journal legal_journal_current_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_journal
    ADD CONSTRAINT legal_journal_current_hash_key UNIQUE (current_hash);


--
-- Name: legal_journal legal_journal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_journal
    ADD CONSTRAINT legal_journal_pkey PRIMARY KEY (id);


--
-- Name: legal_journal legal_journal_sequence_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_journal
    ADD CONSTRAINT legal_journal_sequence_number_key UNIQUE (sequence_number);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_key UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: sub_bills sub_bills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_bills
    ADD CONSTRAINT sub_bills_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (user_id, permission_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_archive_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_archive_status ON public.archive_exports USING btree (export_status, created_at);


--
-- Name: idx_archive_type_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_archive_type_period ON public.archive_exports USING btree (export_type, period_start);


--
-- Name: idx_closure_bulletins_period_start; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_closure_bulletins_period_start ON public.closure_bulletins USING btree (period_start);


--
-- Name: idx_closure_closed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_closure_closed ON public.closure_bulletins USING btree (is_closed, created_at);


--
-- Name: idx_closure_type_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_closure_type_period ON public.closure_bulletins USING btree (closure_type, period_start);


--
-- Name: idx_legal_journal_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_legal_journal_order ON public.legal_journal USING btree (order_id);


--
-- Name: idx_legal_journal_register; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_legal_journal_register ON public.legal_journal USING btree (register_id);


--
-- Name: idx_legal_journal_sequence; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_legal_journal_sequence ON public.legal_journal USING btree (sequence_number);


--
-- Name: idx_legal_journal_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_legal_journal_timestamp ON public.legal_journal USING btree ("timestamp");


--
-- Name: idx_legal_journal_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_legal_journal_type ON public.legal_journal USING btree (transaction_type);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- Name: idx_products_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);


--
-- Name: idx_sub_bills_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sub_bills_order_id ON public.sub_bills USING btree (order_id);


--
-- Name: closure_bulletins trigger_prevent_closed_bulletin_modification; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_prevent_closed_bulletin_modification BEFORE DELETE OR UPDATE ON public.closure_bulletins FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_bulletin_modification();


--
-- Name: legal_journal trigger_prevent_legal_journal_modification; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_prevent_legal_journal_modification BEFORE DELETE OR UPDATE ON public.legal_journal FOR EACH ROW EXECUTE FUNCTION public.prevent_legal_journal_modification();


--
-- Name: legal_journal legal_journal_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_journal
    ADD CONSTRAINT legal_journal_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: sub_bills sub_bills_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_bills
    ADD CONSTRAINT sub_bills_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: TABLE archive_exports; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.archive_exports TO musebar_user;


--
-- Name: SEQUENCE archive_exports_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.archive_exports_id_seq TO musebar_user;


--
-- Name: TABLE categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.categories TO musebar_user;


--
-- Name: SEQUENCE categories_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.categories_id_seq TO musebar_user;


--
-- Name: TABLE closure_bulletins; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.closure_bulletins TO musebar_user;


--
-- Name: SEQUENCE closure_bulletins_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.closure_bulletins_id_seq TO musebar_user;


--
-- Name: TABLE legal_journal; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT ON TABLE public.legal_journal TO musebar_user;


--
-- Name: SEQUENCE legal_journal_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.legal_journal_id_seq TO musebar_user;


--
-- Name: TABLE order_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.order_items TO musebar_user;


--
-- Name: SEQUENCE order_items_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.order_items_id_seq TO musebar_user;


--
-- Name: TABLE orders; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.orders TO musebar_user;


--
-- Name: SEQUENCE orders_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.orders_id_seq TO musebar_user;


--
-- Name: TABLE products; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.products TO musebar_user;


--
-- Name: SEQUENCE products_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.products_id_seq TO musebar_user;


--
-- Name: TABLE sub_bills; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sub_bills TO musebar_user;


--
-- Name: SEQUENCE sub_bills_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.sub_bills_id_seq TO musebar_user;


--
-- PostgreSQL database dump complete
--

