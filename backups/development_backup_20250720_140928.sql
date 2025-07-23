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
-- Name: prevent_closed_bulletin_modification(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_closed_bulletin_modification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.is_closed = TRUE THEN
        RAISE EXCEPTION 'Modification of closed closure bulletin is forbidden for legal compliance';
    END IF;
    IF TG_OP = 'DELETE' AND OLD.is_closed = TRUE THEN
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
    IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
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
    CONSTRAINT archive_exports_export_status_check CHECK (((export_status)::text = ANY ((ARRAY['PENDING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying, 'VERIFIED'::character varying])::text[]))),
    CONSTRAINT archive_exports_export_type_check CHECK (((export_type)::text = ANY ((ARRAY['DAILY'::character varying, 'MONTHLY'::character varying, 'ANNUAL'::character varying, 'FULL'::character varying])::text[]))),
    CONSTRAINT archive_exports_format_check CHECK (((format)::text = ANY ((ARRAY['CSV'::character varying, 'XML'::character varying, 'PDF'::character varying, 'JSON'::character varying])::text[]))),
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
    user_id character varying(50),
    action_type character varying(100) NOT NULL,
    resource_type character varying(100),
    resource_id character varying(50),
    action_details jsonb,
    ip_address inet,
    user_agent text,
    session_id character varying(100),
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
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
    is_active boolean DEFAULT true,
    color character varying(7) DEFAULT '#1976d2'::character varying
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
    tips_total numeric(12,2) DEFAULT 0 NOT NULL,
    change_total numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT closure_bulletins_closure_type_check CHECK (((closure_type)::text = ANY ((ARRAY['DAILY'::character varying, 'WEEKLY'::character varying, 'MONTHLY'::character varying, 'ANNUAL'::character varying])::text[]))),
    CONSTRAINT period_valid CHECK ((period_end >= period_start)),
    CONSTRAINT sequence_order CHECK (((last_sequence IS NULL) OR (first_sequence IS NULL) OR (last_sequence >= first_sequence))),
    CONSTRAINT tips_change_positive CHECK (((tips_total >= (0)::numeric) AND (change_total >= (0)::numeric))),
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
    CONSTRAINT legal_journal_transaction_type_check CHECK (((transaction_type)::text = ANY ((ARRAY['SALE'::character varying, 'REFUND'::character varying, 'CORRECTION'::character varying, 'CLOSURE'::character varying, 'ARCHIVE'::character varying])::text[]))),
    CONSTRAINT sequence_positive CHECK ((sequence_number >= 0)),
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
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    description text
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: COLUMN order_items.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.order_items.description IS 'Description for special items like Divers, used for traceability and legal compliance';


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
    tips numeric(10,2) DEFAULT 0,
    change numeric(10,2) DEFAULT 0
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
1	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:14:49.311
2	\N	CREATE_ORDER	ORDER	1	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Triple", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}], "notes": "Paiement par carte: 6.50€", "status": "completed", "total_tax": 1.0833333333333335, "total_amount": 6.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:15:08.353
3	\N	CREATE_ORDER	ORDER	2	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 41, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Blanche", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}, {"quantity": 1, "tax_rate": 20, "product_id": 42, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Spritz Sureau", "happy_hour_applied": true, "happy_hour_discount_amount": 1.75}], "notes": "Paiement par carte: 13.50€", "status": "completed", "total_tax": 2.25, "total_amount": 13.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:15:21.801
4	1	CREATE_CATEGORY	CATEGORY	29	{"name": "Mocktails", "default_tax_rate": 20}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:16:09.877
5	\N	AUTH_FAILED	\N	\N	{"reason": "Missing token"}	::1	curl/8.5.0	\N	2025-07-05 17:17:39.593
6	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:19:36.172
7	1	CREATE_PRODUCT	PRODUCT	43	{"name": "Dry Quiri", "price": 5.5, "tax_rate": 10, "category_id": 29, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:20:07.117
8	1	CREATE_CATEGORY	CATEGORY	30	{"name": "Softs", "default_tax_rate": 20}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:20:23.894
9	1	CREATE_PRODUCT	PRODUCT	44	{"name": "Bissap", "price": 5.5, "tax_rate": 10, "category_id": 30, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:21:01.066
10	1	CREATE_PRODUCT	PRODUCT	45	{"name": "Ginger", "price": 5.5, "tax_rate": 10, "category_id": 30, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:21:50.784
11	\N	CREATE_ORDER	ORDER	3	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 44, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Bissap", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}, {"quantity": 1, "tax_rate": 10, "product_id": 43, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Dry Quiri", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}], "notes": "Paiement par carte: 9.00€", "status": "completed", "total_tax": 0.8181818181818181, "total_amount": 9, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:22:25.868
12	\N	CREATE_ORDER	ORDER	4	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "IPA", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}, {"quantity": 1, "tax_rate": 10, "product_id": 45, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Ginger", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}], "notes": "Paiement par carte: 11.00€", "status": "completed", "total_tax": 1.4924242424242427, "total_amount": 11, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:23:06.018
13	1	CREATE_PRODUCT	PRODUCT	46	{"name": "Blonde de Soif", "price": 7.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:33:48.526
14	1	CREATE_PRODUCT	PRODUCT	47	{"name": "Blonde de Soif", "price": 3.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:34:10.76
15	1	UPDATE_PRODUCT	PRODUCT	46	{"name": "Blonde de Soif", "price": 6, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:34:23.607
16	1	UPDATE_PRODUCT	PRODUCT	47	{"name": "Blonde de Soif", "price": 3.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:34:31.222
17	1	CREATE_PRODUCT	PRODUCT	48	{"name": "Blanche", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:34:49.12
144	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:24:31.069
18	1	CREATE_PRODUCT	PRODUCT	49	{"name": "IPA", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:35:09.712
19	1	CREATE_PRODUCT	PRODUCT	50	{"name": "Romarin", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:35:28.689
20	1	CREATE_PRODUCT	PRODUCT	51	{"name": "Triple", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:35:55.952
21	1	CREATE_PRODUCT	PRODUCT	52	{"name": "NEIPA", "price": 7.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:36:26.867
22	1	CREATE_PRODUCT	PRODUCT	53	{"name": "NEIPA", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:36:43.572
23	1	CREATE_PRODUCT	PRODUCT	54	{"name": "Rouge", "price": 7.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:37:16.946
24	1	CREATE_PRODUCT	PRODUCT	55	{"name": "Rouge", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:37:32.061
25	1	CREATE_PRODUCT	PRODUCT	56	{"name": "Bière du Moment", "price": 7.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:38:29.377
26	1	CREATE_PRODUCT	PRODUCT	57	{"name": "Bière du Moment", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:39:15.224
27	1	CREATE_PRODUCT	PRODUCT	58	{"name": "Picon", "price": 7, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:40:09.692
28	1	CREATE_PRODUCT	PRODUCT	59	{"name": "Picon", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:40:32.927
29	1	UPDATE_PRODUCT	PRODUCT	58	{"name": "Picon", "price": 7, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:40:46.634
30	1	CREATE_PRODUCT	PRODUCT	60	{"name": "Coca", "price": 4, "tax_rate": 10, "category_id": 30, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:41:27.799
31	\N	CREATE_ORDER	ORDER	5	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 47, "tax_amount": 0.5833333333333334, "unit_price": 3.5, "total_price": 3.5, "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 60, "tax_amount": 0.27272727272727276, "unit_price": 3, "total_price": 3, "product_name": "Coca", "happy_hour_applied": true, "happy_hour_discount_amount": 0.75}], "notes": "Paiement par carte: 6.50€", "status": "completed", "total_tax": 0.8560606060606062, "total_amount": 6.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:41:47.21
32	1	CREATE_PRODUCT	PRODUCT	61	{"name": "Spritz Apérol", "price": 7, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:42:11.503
33	1	CREATE_PRODUCT	PRODUCT	62	{"name": "Spritz Campari", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:42:29.512
34	1	CREATE_PRODUCT	PRODUCT	63	{"name": "Spritz Limoncello", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:43:15.203
35	1	CREATE_PRODUCT	PRODUCT	64	{"name": "Amaretto Stormy", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:43:55.612
145	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:24:31.072
36	1	CREATE_PRODUCT	PRODUCT	65	{"name": "Cocktail du moment", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:44:14.237
37	1	CREATE_PRODUCT	PRODUCT	66	{"name": "Caïpi", "price": 7, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:44:55.006
38	1	CREATE_PRODUCT	PRODUCT	67	{"name": "Caïpi liqueur", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:45:13.356
39	1	CREATE_PRODUCT	PRODUCT	68	{"name": "Espresso Martini", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:45:37.9
40	1	CREATE_PRODUCT	PRODUCT	69	{"name": "Gin To", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:45:53.495
41	1	CREATE_PRODUCT	PRODUCT	70	{"name": "Gin To liqueur", "price": 9, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:46:11.007
42	1	CREATE_PRODUCT	PRODUCT	71	{"name": "Bramble Star", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:48:10.034
43	1	CREATE_PRODUCT	PRODUCT	72	{"name": "Moscow Mule", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:48:43.54
44	1	CREATE_PRODUCT	PRODUCT	73	{"name": "Jus de Pomme Pétillant", "price": 5.5, "tax_rate": 10, "category_id": 30, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:50:21.551
45	1	CREATE_PRODUCT	PRODUCT	74	{"name": "London Mule", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:50:53.936
46	1	CREATE_PRODUCT	PRODUCT	75	{"name": "Jamaïcan Mule", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:52:19.143
47	1	CREATE_PRODUCT	PRODUCT	76	{"name": "Citronnade", "price": 5.5, "tax_rate": 10, "category_id": 29, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:52:45.915
48	1	CREATE_PRODUCT	PRODUCT	77	{"name": "Sirop", "price": 2, "tax_rate": 10, "category_id": 30, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:53:17.436
49	\N	CREATE_ORDER	ORDER	6	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 77, "tax_amount": 0.18181818181818182, "unit_price": 2, "total_price": 2, "product_name": "Sirop", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 51, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 76, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Citronnade", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}], "notes": "Paiement par carte: 11.00€", "status": "completed", "total_tax": 1.3409090909090908, "total_amount": 11, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:53:54.677
50	\N	CREATE_ORDER	ORDER	7	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "IPA", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}, {"quantity": 1, "tax_rate": 20, "product_id": 46, "tax_amount": 0.8333333333333334, "unit_price": 5, "total_price": 5, "product_name": "Blonde de Soif", "happy_hour_applied": true, "happy_hour_discount_amount": 1.25}], "notes": "Paiement par carte: 11.50€", "status": "completed", "total_tax": 1.916666666666667, "total_amount": 11.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:55:33.903
51	1	CREATE_PRODUCT	PRODUCT	78	{"name": "Whiskey Coca", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:56:27.454
146	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:25:01.54
52	1	CREATE_PRODUCT	PRODUCT	79	{"name": "Whiskey Coca double", "price": 10, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:56:54.602
53	1	CREATE_PRODUCT	PRODUCT	80	{"name": "Cuba Libre", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:57:12.05
54	1	CREATE_CATEGORY	CATEGORY	31	{"name": "Vins", "default_tax_rate": 20}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:57:44.951
55	1	CREATE_PRODUCT	PRODUCT	81	{"name": "CDR", "price": 6.5, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:58:00.46
56	1	CREATE_PRODUCT	PRODUCT	82	{"name": "CDR", "price": 25, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:58:19.973
57	1	CREATE_PRODUCT	PRODUCT	83	{"name": "Blaye", "price": 6.5, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:58:56.964
58	1	CREATE_PRODUCT	PRODUCT	84	{"name": "Blaye", "price": 25, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:59:17.287
59	1	CREATE_PRODUCT	PRODUCT	85	{"name": "Chardo", "price": 5.5, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 17:59:35.074
60	1	CREATE_PRODUCT	PRODUCT	86	{"name": "Chardo", "price": 23, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:00:03.602
61	1	CREATE_PRODUCT	PRODUCT	87	{"name": "Uby 3", "price": 6.5, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:00:28.62
62	1	CREATE_PRODUCT	PRODUCT	88	{"name": "Uby 3", "price": 25, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:00:48.117
63	1	CREATE_PRODUCT	PRODUCT	89	{"name": "Uby 4", "price": 6.5, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:01:12.878
64	1	CREATE_PRODUCT	PRODUCT	90	{"name": "Uby 4", "price": 25, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:01:40.452
65	1	CREATE_CATEGORY	CATEGORY	32	{"name": "Apéritifs", "default_tax_rate": 20}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:02:20.307
66	1	CREATE_PRODUCT	PRODUCT	91	{"name": "Negroni", "price": 8, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:02:44.579
67	1	CREATE_PRODUCT	PRODUCT	92	{"name": "Proscecco", "price": 5.5, "tax_rate": 20, "category_id": 31, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:03:21.603
68	1	CREATE_PRODUCT	PRODUCT	93	{"name": "Pastis", "price": 4, "tax_rate": 20, "category_id": 32, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:03:36.696
69	1	CREATE_PRODUCT	PRODUCT	94	{"name": "Bellini", "price": 6.5, "tax_rate": 20, "category_id": 32, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:04:24.692
70	1	CREATE_PRODUCT	PRODUCT	95	{"name": "Amricano", "price": 6.5, "tax_rate": 20, "category_id": 32, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:04:37.534
71	1	CREATE_PRODUCT	PRODUCT	96	{"name": "Menthe Pastille/Get", "price": 6.5, "tax_rate": 20, "category_id": 32, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:04:55.838
150	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 14:24:09.003475
72	1	CREATE_PRODUCT	PRODUCT	97	{"name": "Baileys", "price": 6.5, "tax_rate": 20, "category_id": 32, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:05:11.839
73	1	UPDATE_PRODUCT	PRODUCT	95	{"name": "Americano", "price": 6.5, "tax_rate": 20, "category_id": 32, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:05:39.519
74	1	CREATE_PRODUCT	PRODUCT	98	{"name": "Café", "price": 2, "tax_rate": 10, "category_id": 30, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:05:59.801
75	1	CREATE_PRODUCT	PRODUCT	99	{"name": "Jus de Fruit", "price": 4, "tax_rate": 10, "category_id": 30, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:06:24.519
76	1	CREATE_PRODUCT	PRODUCT	100	{"name": "IPA Sans Alcool", "price": 5.5, "tax_rate": 10, "category_id": 30, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:08:25.591
77	1	CREATE_PRODUCT	PRODUCT	101	{"name": "Bière Sirop", "price": 7, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:09:36.733
78	1	UPDATE_PRODUCT	PRODUCT	101	{"name": "Bière Sirop", "price": 7, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:09:55.529
79	1	CREATE_PRODUCT	PRODUCT	102	{"name": "Bière Sirop", "price": 4.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:10:39.535
80	1	CREATE_CATEGORY	CATEGORY	33	{"name": "A Manger", "default_tax_rate": 20}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:11:13.948
81	1	CREATE_PRODUCT	PRODUCT	103	{"name": "Planche", "price": 21, "tax_rate": 10, "category_id": 33, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:11:28.609
82	1	CREATE_PRODUCT	PRODUCT	104	{"name": "Focaccia ", "price": 8, "tax_rate": 10, "category_id": 33, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:11:47.667
83	1	CREATE_PRODUCT	PRODUCT	105	{"name": "Saucisson", "price": 6.5, "tax_rate": 10, "category_id": 33, "is_happy_hour_eligible": false, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:12:06.354
84	1	ARCHIVE_PRODUCT	PRODUCT	41	{"reason": "Product used in orders", "product_id": 41, "deletion_type": "soft_delete"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:13:43.937
85	\N	CREATE_ORDER	ORDER	8	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 76, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Citronnade", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}, {"quantity": 1, "tax_rate": 10, "product_id": 44, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Bissap", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}], "notes": "Paiement: 9.00€, Rendu: 0.00€", "status": "completed", "total_tax": 0.8181818181818181, "total_amount": 9, "payment_method": "cash"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:30:42.541
86	\N	CREATE_ORDER	ORDER	9	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 47, "tax_amount": 0.5833333333333334, "unit_price": 3.5, "total_price": 3.5, "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 3.50€", "status": "completed", "total_tax": 0.5833333333333334, "total_amount": 3.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:36:03.625
87	\N	CREATE_ORDER	ORDER	10	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 44, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Bissap", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}, {"quantity": 1, "tax_rate": 10, "product_id": 73, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Jus de Pomme Pétillant", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}, {"quantity": 1, "tax_rate": 10, "product_id": 76, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Citronnade", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}, {"quantity": 1, "tax_rate": 10, "product_id": 44, "tax_amount": 0.40909090909090906, "unit_price": 4.5, "total_price": 4.5, "product_name": "Bissap", "happy_hour_applied": true, "happy_hour_discount_amount": 1.125}, {"quantity": 1, "tax_rate": 20, "product_id": 66, "tax_amount": 1.0000000000000002, "unit_price": 6, "total_price": 6, "product_name": "Caïpi", "happy_hour_applied": true, "happy_hour_discount_amount": 1.5}, {"quantity": 1, "tax_rate": 20, "product_id": 66, "tax_amount": 1.0000000000000002, "unit_price": 6, "total_price": 6, "product_name": "Caïpi", "happy_hour_applied": true, "happy_hour_discount_amount": 1.5}, {"quantity": 1, "tax_rate": 20, "product_id": 65, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Cocktail du moment", "happy_hour_applied": true, "happy_hour_discount_amount": 1.75}], "notes": "Paiement par carte: 37.00€", "status": "completed", "total_tax": 4.803030303030304, "total_amount": 37, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:45:06.424
103	\N	CREATE_ORDER	ORDER	26	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 53, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "NEIPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 4.50€", "status": "completed", "total_tax": 0.75, "total_amount": 4.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:07:55.465
88	\N	CREATE_ORDER	ORDER	11	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "IPA", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}, {"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "IPA", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}, {"quantity": 1, "tax_rate": 20, "product_id": 46, "tax_amount": 0.8333333333333334, "unit_price": 5, "total_price": 5, "product_name": "Blonde de Soif", "happy_hour_applied": true, "happy_hour_discount_amount": 1.25}], "notes": "Split par items - 3 parts: Part 1: Espèces 6.50€, Part 2: Carte 5.00€, Part 3: Carte 6.50€", "status": "completed", "total_tax": 3.0000000000000004, "total_amount": 18, "payment_method": "split"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:49:00.083
89	\N	CREATE_ORDER	ORDER	12	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Triple", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}], "notes": "Paiement par carte: 6.50€", "status": "completed", "total_tax": 1.0833333333333335, "total_amount": 6.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:57:28.107
90	\N	CREATE_ORDER	ORDER	13	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 105, "tax_amount": 0.5909090909090908, "unit_price": 6.5, "total_price": 6.5, "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 65, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Cocktail du moment", "happy_hour_applied": true, "happy_hour_discount_amount": 1.75}, {"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Triple", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}], "notes": "Paiement par carte: 20.00€", "status": "completed", "total_tax": 2.840909090909091, "total_amount": 20, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 18:59:51.539
91	\N	CREATE_ORDER	ORDER	14	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 52, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "NEIPA", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}, {"quantity": 1, "tax_rate": 20, "product_id": 52, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "NEIPA", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}], "notes": "Paiement par carte: 13.00€", "status": "completed", "total_tax": 2.166666666666667, "total_amount": 13, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:00:13.95
92	\N	CREATE_ORDER	ORDER	15	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 53, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "NEIPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 47, "tax_amount": 0.5833333333333334, "unit_price": 3.5, "total_price": 3.5, "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 68, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Espresso Martini", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 85, "tax_amount": 0.9166666666666667, "unit_price": 5.5, "total_price": 5.5, "product_name": "Chardo", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 42.50€", "status": "completed", "total_tax": 5.492424242424243, "total_amount": 42.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:08:33.399
93	\N	CREATE_ORDER	ORDER	16	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 43, "tax_amount": 0.5, "unit_price": 5.5, "total_price": 5.5, "product_name": "Dry Quiri", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 57, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 25.00€", "status": "completed", "total_tax": 3.75, "total_amount": 25, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:20:46.107
94	\N	CREATE_ORDER	ORDER	17	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 104, "tax_amount": 0.7272727272727273, "unit_price": 8, "total_price": 8, "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 8.00€", "status": "completed", "total_tax": 0.7272727272727273, "total_amount": 8, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:21:05.238
151	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 14:28:34.851794
95	\N	CREATE_ORDER	ORDER	18	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 61, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Spritz Apérol", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 3 parts: Part 1: Carte 7.50€, Part 2: Carte 7.00€, Part 3: Carte 7.50€", "status": "completed", "total_tax": 3.666666666666667, "total_amount": 22, "payment_method": "split"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:23:12.081
96	\N	CREATE_ORDER	ORDER	19	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 15.00€", "status": "completed", "total_tax": 2.5, "total_amount": 15, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:37:57.286
97	\N	CREATE_ORDER	ORDER	20	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 64, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 74, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "London Mule", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 16.00€", "status": "completed", "total_tax": 2.666666666666667, "total_amount": 16, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:41:26.188
98	\N	CREATE_ORDER	ORDER	21	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 66, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Caïpi", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 64, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 15.00€", "status": "completed", "total_tax": 2.5, "total_amount": 15, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:48:01.092
99	\N	CREATE_ORDER	ORDER	22	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 56, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 56, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 15.00€", "status": "completed", "total_tax": 2.5, "total_amount": 15, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:51:10.495
100	\N	CREATE_ORDER	ORDER	23	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 104, "tax_amount": 0.7272727272727273, "unit_price": 8, "total_price": 8, "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 95, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Americano", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 22.00€", "status": "completed", "total_tax": 3.0606060606060606, "total_amount": 22, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 19:58:32.659
101	\N	CREATE_ORDER	ORDER	24	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 49, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 4.50€", "status": "completed", "total_tax": 0.75, "total_amount": 4.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:01:48.589
102	\N	CREATE_ORDER	ORDER	25	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 56, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Carte 7.50€, Part 2: Espèces 7.50€", "status": "completed", "total_tax": 2.5, "total_amount": 15, "payment_method": "split"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:07:17.563
147	1	SET_PERMISSIONS	USER	1	{"permissions": ["access_pos", "access_menu", "access_happy_hour", "access_history", "access_settings", "access_compliance"]}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:25:14.469
104	\N	CREATE_ORDER	ORDER	27	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 7.50€", "status": "completed", "total_tax": 1.25, "total_amount": 7.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:09:52.588
105	\N	CREATE_ORDER	ORDER	28	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 52, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "NEIPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 85, "tax_amount": 0.9166666666666667, "unit_price": 5.5, "total_price": 5.5, "product_name": "Chardo", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 13.00€", "status": "completed", "total_tax": 2.166666666666667, "total_amount": 13, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:24:33.979
106	\N	CREATE_ORDER	ORDER	29	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 61, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Spritz Apérol", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 14.50€", "status": "completed", "total_tax": 2.416666666666667, "total_amount": 14.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:28:08.272
107	\N	CREATE_ORDER	ORDER	30	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 95, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Americano", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 14.00€", "status": "completed", "total_tax": 2.3333333333333335, "total_amount": 14, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:28:40.62
108	\N	CREATE_ORDER	ORDER	31	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement: 15.00€, Rendu: 0.00€", "status": "completed", "total_tax": 2.5, "total_amount": 15, "payment_method": "cash"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:31:15.381
109	\N	CREATE_ORDER	ORDER	32	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 50, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 55, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Rouge", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 9.00€", "status": "completed", "total_tax": 1.5, "total_amount": 9, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:31:26.267
110	\N	CREATE_ORDER	ORDER	33	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 7.50€", "status": "completed", "total_tax": 1.25, "total_amount": 7.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:34:06.549
111	\N	CREATE_ORDER	ORDER	34	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 87, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Uby 3", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 6.50€", "status": "completed", "total_tax": 1.0833333333333335, "total_amount": 6.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:35:14.044
120	\N	CREATE_ORDER	ORDER	41	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 51, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 4.50€", "status": "completed", "total_tax": 0.75, "total_amount": 4.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 21:32:05.68
148	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:32:56.573
152	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 14:39:27.09091
154	1	ARCHIVE_CATEGORY	CATEGORY	33	{"reason": "Category contains products that were used in orders (legal preservation required)", "category_id": 33, "deletion_type": "soft"}	172.16.3.14	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 15:51:41.946017
158	1	RESTORE_CATEGORY	CATEGORY	33	{"category_id": 33}	172.16.3.14	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 15:52:03.090722
112	\N	CREATE_ORDER	ORDER	35	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 47, "tax_amount": 0.5833333333333334, "unit_price": 3.5, "total_price": 3.5, "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 54.50€", "status": "completed", "total_tax": 7.492424242424242, "total_amount": 54.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:36:59.767
113	1	CREATE_PRODUCT	PRODUCT	106	{"name": "Blanche", "price": 7.5, "tax_rate": 20, "category_id": 26, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:37:33.965
114	1	CREATE_PRODUCT	PRODUCT	107	{"name": "Ti Punch", "price": 7, "tax_rate": 20, "category_id": 28, "is_happy_hour_eligible": true, "happy_hour_discount_fixed": null, "happy_hour_discount_percent": 0}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:50:48.557
115	\N	CREATE_ORDER	ORDER	36	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 107, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Ti Punch", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 14.50€", "status": "completed", "total_tax": 2.416666666666667, "total_amount": 14.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 20:51:24.189
116	\N	CREATE_ORDER	ORDER	37	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 106, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Blanche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 7.50€", "status": "completed", "total_tax": 1.25, "total_amount": 7.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 21:07:16.569
117	\N	CREATE_ORDER	ORDER	38	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 106, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Blanche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 40, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 73, "tax_amount": 0.5, "unit_price": 5.5, "total_price": 5.5, "product_name": "Jus de Pomme Pétillant", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 73, "tax_amount": 0.5, "unit_price": 5.5, "total_price": 5.5, "product_name": "Jus de Pomme Pétillant", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 105, "tax_amount": 0.5909090909090908, "unit_price": 6.5, "total_price": 6.5, "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 61.00€", "status": "completed", "total_tax": 7.25, "total_amount": 61, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 21:10:21.307
118	\N	CREATE_ORDER	ORDER	39	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 58, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Picon", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 46, "tax_amount": 1.0000000000000002, "unit_price": 6, "total_price": 6, "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 52, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "NEIPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 81, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "CDR", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 104, "tax_amount": 0.7272727272727273, "unit_price": 8, "total_price": 8, "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 35.00€", "status": "completed", "total_tax": 5.2272727272727275, "total_amount": 35, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 21:28:30.967
119	\N	CREATE_ORDER	ORDER	40	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 83, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Blaye", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 85, "tax_amount": 0.9166666666666667, "unit_price": 5.5, "total_price": 5.5, "product_name": "Chardo", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 12.00€", "status": "completed", "total_tax": 2, "total_amount": 12, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 21:30:46.5
142	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:24:17.787
121	\N	CREATE_ORDER	ORDER	42	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 51, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 104, "tax_amount": 0.7272727272727273, "unit_price": 8, "total_price": 8, "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 104, "tax_amount": 0.7272727272727273, "unit_price": 8, "total_price": 8, "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 81, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "CDR", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 89, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Uby 4", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Carte 13.00€, Part 2: Carte 20.50€", "status": "completed", "total_tax": 4.371212121212121, "total_amount": 33.5, "payment_method": "split"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 21:35:43.164
122	\N	CREATE_ORDER	ORDER	43	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 64, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 8.00€", "status": "completed", "total_tax": 1.3333333333333335, "total_amount": 8, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 21:42:55.395
123	\N	CREATE_ORDER	ORDER	44	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 7.50€", "status": "completed", "total_tax": 1.25, "total_amount": 7.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:09:49.188
124	\N	CREATE_ORDER	ORDER	45	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 57, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 12.00€", "status": "completed", "total_tax": 2, "total_amount": 12, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:11:16.998
125	\N	CREATE_ORDER	ORDER	46	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 57, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 39, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 12.00€", "status": "completed", "total_tax": 2, "total_amount": 12, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:11:53.978
126	\N	CREATE_ORDER	ORDER	47	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 64, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 64, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 64, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 24.00€", "status": "completed", "total_tax": 4, "total_amount": 24, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:12:44.185
127	\N	CREATE_ORDER	ORDER	48	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 64, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Amaretto Stormy", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 8.00€", "status": "completed", "total_tax": 1.3333333333333335, "total_amount": 8, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:17:23.281
143	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:24:17.794
149	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 20:07:08.184
153	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 15:13:46.01093
155	1	RESTORE_CATEGORY	CATEGORY	33	{"category_id": 33}	172.16.3.14	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 15:51:47.811761
156	1	ARCHIVE_PRODUCT	PRODUCT	104	{"reason": "Product used in orders", "product_id": 104, "deletion_type": "soft_delete"}	172.16.3.14	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 15:51:53.521263
161	1	RESTORE_CATEGORY	CATEGORY	33	{"category_id": 33}	172.16.3.14	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 15:52:12.846005
128	\N	CREATE_ORDER	ORDER	49	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 65, "tax_amount": 1.3333333333333335, "unit_price": 8, "total_price": 8, "product_name": "Cocktail du moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 46, "tax_amount": 1.0000000000000002, "unit_price": 6, "total_price": 6, "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 46, "tax_amount": 1.0000000000000002, "unit_price": 6, "total_price": 6, "product_name": "Blonde de Soif", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 43, "tax_amount": 0.5, "unit_price": 5.5, "total_price": 5.5, "product_name": "Dry Quiri", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split égal - 2 parts: Part 1: Carte 23.25€, Part 2: Carte 23.25€", "status": "completed", "total_tax": 5.742424242424243, "total_amount": 46.5, "payment_method": "split"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:28:11.133
129	\N	CREATE_ORDER	ORDER	50	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 76, "tax_amount": 0.5, "unit_price": 5.5, "total_price": 5.5, "product_name": "Citronnade", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 43, "tax_amount": 0.5, "unit_price": 5.5, "total_price": 5.5, "product_name": "Dry Quiri", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 49, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "IPA", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 44, "tax_amount": 0.5, "unit_price": 5.5, "total_price": 5.5, "product_name": "Bissap", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 21.00€", "status": "completed", "total_tax": 2.25, "total_amount": 21, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:28:46.409
130	\N	CREATE_ORDER	ORDER	51	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 21.00€", "status": "completed", "total_tax": 1.909090909090909, "total_amount": 21, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:29:43.299
131	\N	CREATE_ORDER	ORDER	52	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 89, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Uby 4", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 50, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 51, "tax_amount": 0.75, "unit_price": 4.5, "total_price": 4.5, "product_name": "Triple", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 15.50€", "status": "completed", "total_tax": 2.5833333333333335, "total_amount": 15.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:39:00.139
132	\N	CREATE_ORDER	ORDER	53	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 7.50€", "status": "completed", "total_tax": 1.25, "total_amount": 7.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 22:59:52.219
133	\N	CREATE_ORDER	ORDER	54	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 7.50€", "status": "completed", "total_tax": 1.25, "total_amount": 7.5, "payment_method": "card"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-05 23:29:51.162
134	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:10:50.418
135	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:10:55.593
136	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:11:09.004
137	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:11:22.801
138	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:14:11.585
139	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:14:13.985
140	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:23:39.491
141	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-06 13:23:39.494
157	1	ARCHIVE_CATEGORY	CATEGORY	33	{"reason": "Category contains products that were used in orders (legal preservation required)", "category_id": 33, "deletion_type": "soft"}	172.16.3.14	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 15:51:59.006656
159	1	ARCHIVE_CATEGORY	CATEGORY	33	{"reason": "Category contains products that were used in orders (legal preservation required)", "category_id": 33, "deletion_type": "soft"}	172.16.3.14	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 15:52:06.504092
160	1	RESTORE_PRODUCT	PRODUCT	104	{"product_id": 104}	172.16.3.14	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 15:52:11.385036
162	1	ARCHIVE_PRODUCT	PRODUCT	104	{"reason": "Product used in orders", "product_id": 104, "deletion_type": "soft_delete"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 17:49:18.787124
163	1	ARCHIVE_CATEGORY	CATEGORY	33	{"reason": "Category contains products that were used in orders (legal preservation required)", "category_id": 33, "deletion_type": "soft"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 17:51:35.007446
164	1	RESTORE_PRODUCT	PRODUCT	41	{"product_id": 41}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 18:06:31.942146
165	1	RESTORE_CATEGORY	CATEGORY	33	{"category_id": 33}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 18:06:35.222315
166	1	RESTORE_PRODUCT	PRODUCT	104	{"product_id": 104}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 18:06:39.903918
167	1	ARCHIVE_PRODUCT	PRODUCT	106	{"reason": "Product used in orders", "product_id": 106, "deletion_type": "soft_delete"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 18:06:51.227855
168	1	ARCHIVE_CATEGORY	CATEGORY	33	{"reason": "Category and 3 products archived (legal preservation required due to order history)", "category_id": 33, "deletion_type": "soft"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 18:07:10.580131
169	1	RESTORE_PRODUCT	PRODUCT	104	{"product_id": 104}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 18:07:25.26419
170	1	RESTORE_CATEGORY	CATEGORY	33	{"category_id": 33}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 18:07:53.189725
171	1	RESTORE_PRODUCT	PRODUCT	103	{"product_id": 103}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 18:08:00.836061
172	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 18:56:56.760898
173	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": false}	192.168.0.235	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36	\N	2025-07-08 19:00:44.756171
174	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-08 19:01:20.823708
175	1	CANCEL_ORDER	ORDER	43	{"reason": "Test Fail safe", "tax_breakdown": {"10": 0, "20": 1.3333333333333335}, "cancelled_items": 1, "original_order_id": 43, "total_tax_cancelled": 1.3333333333333335, "partial_cancellation": false, "cancellation_order_id": 55, "total_cancelled_amount": 8}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 12:29:27.518824
176	1	CANCEL_ORDER	ORDER	44	{"reason": "Test Fail Safze", "tax_breakdown": {"10": 0, "20": 1.25}, "cancelled_items": 1, "original_order_id": 44, "total_tax_cancelled": 1.25, "partial_cancellation": false, "cancellation_order_id": 56, "total_cancelled_amount": 7.5}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 12:35:48.574242
177	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	127.0.0.1	curl/8.5.0	\N	2025-07-09 12:50:36.78095
178	1	CANCEL_ORDER	ORDER	39	{"reason": "Test Fail Safe", "tax_breakdown": {"10": 0.7272727272727273, "20": 4.5}, "cancelled_items": 5, "original_order_id": 39, "total_tax_cancelled": 5.2272727272727275, "partial_cancellation": false, "cancellation_order_id": 57, "total_cancelled_amount": 35}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 12:54:30.839893
179	\N	CREATE_ORDER	ORDER	58	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 105.00€", "status": "completed", "total_tax": 9.545454545454545, "total_amount": 105, "payment_method": "card"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 12:55:09.70204
180	1	CANCEL_ORDER	ORDER	58	{"reason": "Test Fail Safe", "tax_breakdown": {"10": 9.545454545454545, "20": 0}, "cancelled_items": 5, "original_order_id": 58, "total_tax_cancelled": 9.545454545454545, "partial_cancellation": false, "cancellation_order_id": 59, "total_cancelled_amount": 105}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 12:55:59.975216
181	\N	AUTH_FAILED	\N	\N	{"reason": "Invalid token"}	127.0.0.1	curl/8.5.0	\N	2025-07-09 12:58:38.439531
182	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	192.168.0.13	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36	\N	2025-07-09 13:06:27.994155
183	\N	CREATE_ORDER	ORDER	60	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 104, "tax_amount": 0.7272727272727273, "unit_price": 8, "total_price": 8, "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 8.00€", "status": "completed", "total_tax": 0.7272727272727273, "total_amount": 8, "payment_method": "card"}	192.168.0.13	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36	\N	2025-07-09 13:07:42.811768
184	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	192.168.0.11	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 13:08:55.493116
185	\N	CREATE_ORDER	ORDER	61	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 126.00€", "status": "completed", "total_tax": 11.454545454545453, "total_amount": 126, "payment_method": "card"}	192.168.0.11	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 13:15:51.286518
186	\N	CREATE_ORDER	ORDER	62	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 105.00€", "status": "completed", "total_tax": 9.545454545454545, "total_amount": 105, "payment_method": "card"}	192.168.0.11	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 13:17:26.578599
187	\N	CREATE_ORDER	ORDER	63	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 63.00€", "status": "completed", "total_tax": 5.727272727272727, "total_amount": 63, "payment_method": "card"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 13:20:53.421488
188	\N	CREATE_ORDER	ORDER	64	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 94, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Bellini", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 94, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Bellini", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 94, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Bellini", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 94, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Bellini", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 94, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Bellini", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 32.50€", "status": "completed", "total_tax": 5.416666666666668, "total_amount": 32.5, "payment_method": "card"}	192.168.0.11	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 13:22:24.287936
204	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 18:19:57.560637
189	\N	CREATE_ORDER	ORDER	65	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 56, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 7.50€", "status": "completed", "total_tax": 1.25, "total_amount": 7.5, "payment_method": "card"}	192.168.0.11	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 14:21:41.033582
190	\N	CREATE_ORDER	ORDER	66	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 104, "tax_amount": 0.7272727272727273, "unit_price": 8, "total_price": 8, "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 8.00€", "status": "completed", "total_tax": 0.7272727272727273, "total_amount": 8, "payment_method": "card"}	192.168.0.11	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 14:51:48.860692
191	\N	CREATE_ORDER	ORDER	67	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 21.00€", "status": "completed", "total_tax": 1.909090909090909, "total_amount": 21, "payment_method": "card"}	192.168.0.11	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 14:53:27.535268
192	\N	CREATE_ORDER	ORDER	68	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 105, "tax_amount": 0.5909090909090908, "unit_price": 6.5, "total_price": 6.5, "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 6.50€", "status": "completed", "total_tax": 0.5909090909090908, "total_amount": 6.5, "payment_method": "card"}	192.168.0.11	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 14:54:08.301259
193	\N	CREATE_ORDER	ORDER	69	{"items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 21.00€", "status": "completed", "total_tax": 1.909090909090909, "total_amount": 21, "payment_method": "card"}	192.168.0.11	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 15:03:27.13225
194	\N	CREATE_ORDER	ORDER	71	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.67, "unit_price": 10, "total_price": 10, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Test order with tip", "status": "completed", "total_tax": 1.67, "total_amount": 10, "payment_method": "card"}	127.0.0.1	curl/8.5.0	\N	2025-07-09 16:32:45.914688
195	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 16:40:29.333713
196	\N	CREATE_ORDER	ORDER	72	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 0.83, "unit_price": 5, "total_price": 5, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Simple test", "status": "completed", "total_tax": 0.83, "total_amount": 5, "payment_method": "card"}	127.0.0.1	curl/8.5.0	\N	2025-07-09 16:44:58.875138
197	\N	CREATE_ORDER	ORDER	73	{"items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 0.5, "unit_price": 3, "total_price": 3, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Debug test", "status": "completed", "total_tax": 0.5, "total_amount": 3, "payment_method": "card"}	127.0.0.1	curl/8.5.0	\N	2025-07-09 16:46:19.361581
198	\N	CREATE_ORDER	ORDER	74	{"tips": 3, "items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 0.67, "unit_price": 4, "total_price": 4, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Debug test 2", "change": 2, "status": "completed", "total_tax": 0.67, "total_amount": 4, "payment_method": "card"}	127.0.0.1	curl/8.5.0	\N	2025-07-09 16:47:05.78228
199	\N	CREATE_ORDER	ORDER	75	{"tips": 2.5, "items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 2.5, "unit_price": 15, "total_price": 15, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Order with tip", "change": 0, "status": "completed", "total_tax": 2.5, "total_amount": 15, "payment_method": "card"}	127.0.0.1	curl/8.5.0	\N	2025-07-09 16:47:39.742273
200	\N	CREATE_ORDER	ORDER	76	{"tips": 1, "items": [{"quantity": 1, "tax_rate": 20, "product_id": 37, "tax_amount": 1.33, "unit_price": 8, "total_price": 8, "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Cash order with change", "change": 2, "status": "completed", "total_tax": 1.33, "total_amount": 8, "payment_method": "cash"}	127.0.0.1	curl/8.5.0	\N	2025-07-09 16:47:45.077813
201	\N	CREATE_ORDER	ORDER	77	{"tips": 2, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 21.00€", "change": 0, "status": "completed", "total_tax": 1.909090909090909, "total_amount": 21, "payment_method": "card"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 16:56:58.898463
202	\N	CREATE_ORDER	ORDER	78	{"tips": 0, "items": [], "notes": "Changement de caisse: Carte → Espèces 50.00€", "change": 50, "status": "completed", "total_tax": 0, "total_amount": 0, "payment_method": "cash"}	127.0.0.1	curl/8.5.0	\N	2025-07-09 17:22:41.672929
203	\N	CREATE_ORDER	ORDER	79	{"tips": 0, "items": [], "notes": "Changement de caisse: Espèces → Carte 25.00€", "change": 25, "status": "completed", "total_tax": 0, "total_amount": 0, "payment_method": "card"}	127.0.0.1	curl/8.5.0	\N	2025-07-09 17:22:45.984504
205	\N	CREATE_ORDER	ORDER	80	{"tips": 0, "items": [], "notes": "Faire de la Monnaie: Carte → Espèces 10.00€", "change": 10, "status": "completed", "total_tax": 0, "total_amount": 0, "payment_method": "cash"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 18:20:04.204321
206	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-09 21:36:10.353553
207	\N	CREATE_ORDER	ORDER	81	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Espèces 21.00€, Part 2: Carte 21.00€", "change": 0, "status": "completed", "sub_bills": [{"amount": 21, "status": "paid", "payment_method": "cash"}, {"amount": 21, "status": "paid", "payment_method": "card"}], "total_tax": 3.818181818181818, "total_amount": 42, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 18:34:39.20562
208	\N	CREATE_ORDER	ORDER	82	{"tips": 0, "items": [], "notes": "Faire de la Monnaie: Carte → Espèces 10.00€", "change": 10, "status": "completed", "total_tax": 0, "total_amount": 0, "payment_method": "cash"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 18:34:55.623267
209	\N	CREATE_ORDER	ORDER	83	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 20, "product_id": 41, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Blanche", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}, {"quantity": 1, "tax_rate": 20, "product_id": 41, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Blanche", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}, {"quantity": 1, "tax_rate": 20, "product_id": 41, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Blanche", "happy_hour_applied": true, "happy_hour_discount_amount": 1.625}], "notes": "Split égal - 2 parts: Part 1: Carte 9.75€, Part 2: Split 5.50€ espèces + 4.25€ carte", "change": 0, "status": "completed", "sub_bills": [{"amount": 9.75, "status": "paid", "payment_method": "card"}, {"amount": 5.5, "status": "paid", "payment_method": "cash"}, {"amount": 4.25, "status": "paid", "payment_method": "card"}], "total_tax": 3.2500000000000004, "total_amount": 19.5, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 18:35:38.854416
210	\N	CREATE_ORDER	ORDER	84	{"tips": 10, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 96, "tax_amount": 0.9166666666666667, "unit_price": 5.5, "total_price": 5.5, "product_name": "Menthe Pastille/Get", "happy_hour_applied": true, "happy_hour_discount_amount": 1.375}, {"quantity": 1, "tax_rate": 20, "product_id": 96, "tax_amount": 0.9166666666666667, "unit_price": 5.5, "total_price": 5.5, "product_name": "Menthe Pastille/Get", "happy_hour_applied": true, "happy_hour_discount_amount": 1.375}], "notes": "Paiement par carte: 53.00€", "change": 0, "status": "completed", "total_tax": 5.651515151515151, "total_amount": 53, "payment_method": "card"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 18:36:22.270086
211	\N	CREATE_ORDER	ORDER	85	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 104, "tax_amount": 0.7272727272727273, "unit_price": 8, "total_price": 8, "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 104, "tax_amount": 0.7272727272727273, "unit_price": 8, "total_price": 8, "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement: 16.00€, Rendu: 0.00€", "change": 0, "status": "completed", "total_tax": 1.4545454545454546, "total_amount": 16, "payment_method": "cash"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 18:36:33.112234
212	\N	CREATE_ORDER	ORDER	86	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 20, "product_id": 95, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Americano", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 95, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Americano", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split égal - 2 parts: Part 1: Carte 6.50€, Part 2: Espèces 6.50€", "change": 0, "status": "completed", "sub_bills": [{"amount": 6.5, "status": "paid", "payment_method": "card"}, {"amount": 6.5, "status": "paid", "payment_method": "cash"}], "total_tax": 2.166666666666667, "total_amount": 13, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 19:08:19.163571
222	\N	CREATE_ORDER	ORDER	94	{"tips": 0, "items": [], "notes": "Faire de la Monnaie: Carte → Espèces 10.00€", "change": 10, "status": "completed", "total_tax": 0, "total_amount": 0, "payment_method": "cash"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-12 11:01:40.213484
245	1	UPDATE_CATEGORY	CATEGORY	29	{"name": "Mocktails", "color": "#7f09ce", "default_tax_rate": 20}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 12:41:25.537951
213	\N	CREATE_ORDER	ORDER	87	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 20, "product_id": 96, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Menthe Pastille/Get", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 105, "tax_amount": 0.5909090909090908, "unit_price": 6.5, "total_price": 6.5, "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Espèces 6.50€, Part 2: Carte 6.50€", "change": 0, "status": "completed", "sub_bills": [{"amount": 6.5, "status": "paid", "payment_method": "cash"}, {"amount": 6.5, "status": "paid", "payment_method": "card"}], "total_tax": 1.6742424242424243, "total_amount": 13, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 19:09:27.623946
214	\N	CREATE_ORDER	ORDER	88	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement: 21.00€, Rendu: 0.00€", "change": 0, "status": "completed", "total_tax": 1.909090909090909, "total_amount": 21, "payment_method": "cash"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 19:25:21.859868
215	\N	CREATE_ORDER	ORDER	89	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 104, "tax_amount": 0.7272727272727273, "unit_price": 8, "total_price": 8, "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement: 8.00€, Rendu: 0.00€", "change": 0, "status": "completed", "total_tax": 0.7272727272727273, "total_amount": 8, "payment_method": "cash"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 19:27:14.946801
216	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-11 21:21:58.372899
217	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-12 10:44:24.332535
218	\N	CREATE_ORDER	ORDER	90	{"tips": 10, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split par items - 2 parts: Part 1: Espèces 42.00€, Part 2: Split 11.00€ espèces + 10.00€ carte", "change": 0, "status": "completed", "sub_bills": [{"amount": 42, "status": "paid", "payment_method": "cash"}, {"amount": 11, "status": "paid", "payment_method": "cash"}, {"amount": 10, "status": "paid", "payment_method": "card"}], "total_tax": 5.727272727272727, "total_amount": 63, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-12 11:00:59.00138
219	\N	CREATE_ORDER	ORDER	91	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 105, "tax_amount": 0.5909090909090908, "unit_price": 6.5, "total_price": 6.5, "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 105, "tax_amount": 0.5909090909090908, "unit_price": 6.5, "total_price": 6.5, "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 105, "tax_amount": 0.5909090909090908, "unit_price": 6.5, "total_price": 6.5, "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Split égal - 2 parts: Part 1: Carte 9.75€, Part 2: Espèces 9.75€", "change": 0, "status": "completed", "sub_bills": [{"amount": 9.75, "status": "paid", "payment_method": "card"}, {"amount": 9.75, "status": "paid", "payment_method": "cash"}], "total_tax": 1.7727272727272725, "total_amount": 19.5, "payment_method": "split"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-12 11:01:11.446412
220	\N	CREATE_ORDER	ORDER	92	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 20, "product_id": 56, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 56, "tax_amount": 1.25, "unit_price": 7.5, "total_price": 7.5, "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 15.00€", "change": 0, "status": "completed", "total_tax": 2.5, "total_amount": 15, "payment_method": "card"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-12 11:01:22.568571
221	\N	CREATE_ORDER	ORDER	93	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 20, "product_id": 101, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Bière Sirop", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 101, "tax_amount": 1.1666666666666667, "unit_price": 7, "total_price": 7, "product_name": "Bière Sirop", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement: 14.00€, Rendu: 0.00€", "change": 0, "status": "completed", "total_tax": 2.3333333333333335, "total_amount": 14, "payment_method": "cash"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-12 11:01:31.651831
223	\N	CREATE_ORDER	ORDER	95	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 105.00€", "change": 0, "status": "completed", "total_tax": 9.545454545454545, "total_amount": 105, "payment_method": "card"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-12 13:13:49.490573
224	\N	CREATE_ORDER	ORDER	96	{"tips": 10, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 21.00€", "change": 0, "status": "completed", "total_tax": 1.909090909090909, "total_amount": 21, "payment_method": "card"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-12 13:19:59.126745
225	\N	CREATE_ORDER	ORDER	97	{"tips": 20, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 105, "tax_amount": 0.5909090909090908, "unit_price": 6.5, "total_price": 6.5, "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 6.50€", "change": 0, "status": "completed", "total_tax": 0.5909090909090908, "total_amount": 6.5, "payment_method": "card"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-12 13:20:27.102986
226	\N	CREATE_ORDER	ORDER	98	{"tips": 0, "items": [], "notes": "Faire de la Monnaie: Carte → Espèces 100.00€", "change": 100, "status": "completed", "total_tax": 0, "total_amount": 0, "payment_method": "cash"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-12 13:20:52.084658
227	1	RESTORE_PRODUCT	PRODUCT	106	{"product_id": 106}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 11:48:07.644519
228	1	DELETE_CATEGORY	CATEGORY	35	{"reason": "Category and 0 products permanently deleted (no order history)", "category_id": 35, "deletion_type": "hard"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 11:48:20.004012
229	1	DELETE_CATEGORY	CATEGORY	37	{"reason": "Category and 0 products permanently deleted (no order history)", "category_id": 37, "deletion_type": "hard"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 11:48:24.613099
230	1	DELETE_CATEGORY	CATEGORY	38	{"reason": "Category and 0 products permanently deleted (no order history)", "category_id": 38, "deletion_type": "hard"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 11:48:32.525429
231	1	DELETE_CATEGORY	CATEGORY	36	{"reason": "Category and 0 products permanently deleted (no order history)", "category_id": 36, "deletion_type": "hard"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 11:48:37.881401
232	1	DELETE_CATEGORY	CATEGORY	34	{"reason": "Category and 0 products permanently deleted (no order history)", "category_id": 34, "deletion_type": "hard"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 11:48:44.004016
233	\N	AUTH_FAILED	\N	\N	{"reason": "Missing token"}	127.0.0.1	curl/8.5.0	\N	2025-07-16 12:02:08.300841
234	1	UPDATE_CATEGORY	CATEGORY	32	{"name": "Apéritifs", "default_tax_rate": 20}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 12:26:47.974021
235	1	UPDATE_CATEGORY	CATEGORY	32	{"name": "Apéritifs", "default_tax_rate": 20}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 12:27:03.619672
236	1	UPDATE_CATEGORY	CATEGORY	32	{"name": "Apéritifs", "default_tax_rate": 20}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 12:30:35.107033
237	1	UPDATE_CATEGORY	CATEGORY	32	{"name": "Apéritifs", "default_tax_rate": 20}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 12:32:45.160434
238	1	UPDATE_CATEGORY	CATEGORY	32	{"name": "Apéritifs", "default_tax_rate": 20}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 12:33:35.177709
239	\N	AUTH_FAILED	\N	\N	{"reason": "Missing token"}	127.0.0.1	curl/8.5.0	\N	2025-07-16 12:36:31.524535
240	1	LOGIN_FAILED	\N	\N	{"email": "elliot.vergne@gmail.com", "reason": "Invalid password"}	127.0.0.1	curl/8.5.0	\N	2025-07-16 12:36:41.384095
241	1	LOGIN_FAILED	\N	\N	{"email": "elliot.vergne@gmail.com", "reason": "Invalid password"}	127.0.0.1	curl/8.5.0	\N	2025-07-16 12:36:50.585423
242	1	UPDATE_CATEGORY	CATEGORY	32	{"name": "Apéritifs", "color": "#d21919", "default_tax_rate": 20}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 12:39:59.067675
243	1	UPDATE_CATEGORY	CATEGORY	26	{"name": "Bières", "color": "#f3d61b", "default_tax_rate": 20}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 12:40:21.787807
244	1	UPDATE_CATEGORY	CATEGORY	28	{"name": "Cocktails", "color": "#24d40c", "default_tax_rate": 20}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 12:40:57.269036
246	1	UPDATE_CATEGORY	CATEGORY	30	{"name": "Softs", "color": "#19d27b", "default_tax_rate": 20}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 12:41:42.634772
247	1	UPDATE_CATEGORY	CATEGORY	31	{"name": "Vins", "color": "#d34a5f", "default_tax_rate": 20}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 12:41:57.223636
248	\N	CREATE_ORDER	ORDER	99	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": 103, "tax_amount": 1.909090909090909, "unit_price": 21, "total_price": 21, "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 96, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Menthe Pastille/Get", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 20, "product_id": 96, "tax_amount": 1.0833333333333335, "unit_price": 6.5, "total_price": 6.5, "product_name": "Menthe Pastille/Get", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 76.00€", "change": 0, "status": "completed", "total_tax": 7.8939393939393945, "total_amount": 76, "payment_method": "card"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-16 14:13:08.556785
249	1	LOGIN	\N	\N	{"email": "elliot.vergne@gmail.com", "rememberMe": true}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-20 14:01:11.180774
250	1	CREATE_ORDER	ORDER	100	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": null, "tax_amount": 0.18, "unit_price": 2, "total_price": 2, "product_name": "Divers", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 2.00€", "change": 0, "status": "completed", "total_tax": 0.18, "total_amount": 2, "payment_method": "card"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-20 14:01:27.218409
251	1	CREATE_ORDER	ORDER	101	{"tips": 0, "items": [{"quantity": 1, "tax_rate": 10, "product_id": 104, "tax_amount": 0.73, "unit_price": 8, "total_price": 8, "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": 0}, {"quantity": 1, "tax_rate": 10, "product_id": null, "tax_amount": 0.18, "unit_price": 2, "total_price": 2, "product_name": "Divers", "happy_hour_applied": false, "happy_hour_discount_amount": 0}], "notes": "Paiement par carte: 10.00€", "change": 0, "status": "completed", "total_tax": 0.91, "total_amount": 10, "payment_method": "card"}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-20 14:01:56.684511
252	1	CANCEL_ORDER	ORDER	102	{"reason": "fdghdfgdfnb", "original_tax": 0.18, "original_tips": 0, "payment_method": "card", "items_cancelled": 1, "original_amount": 2, "original_change": 0, "original_order_id": 100, "cancellation_amount": 2, "cancellation_order_id": 102}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-20 14:02:25.094796
253	1	CANCEL_ORDER	ORDER	103	{"reason": "bn cbvxc", "original_tax": 0.91, "original_tips": 0, "payment_method": "card", "items_cancelled": 2, "original_amount": 10, "original_change": 0, "original_order_id": 101, "cancellation_amount": 10, "cancellation_order_id": 103}	127.0.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	\N	2025-07-20 14:02:36.060289
\.


--
-- Data for Name: business_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.business_settings (id, name, address, phone, email, siret, tax_identification, updated_at) FROM stdin;
1	Muse	4 Impasse des Hauts Mariages, 76000 Rouen	0601194462	musebar@gmail.com	93133471800018	846926403602047	2025-07-11 20:00:42.575
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, default_tax_rate, created_at, updated_at, is_active, color) FROM stdin;
33	A Manger	20.00	2025-07-05 18:11:13.935	2025-07-08 18:07:53.173093	t	#1976d2
39	DIVERS	10.00	2025-07-16 12:02:55.957913	2025-07-16 12:02:55.957913	t	#1976d2
32	Apéritifs	20.00	2025-07-05 18:02:20.297	2025-07-16 12:39:59.053925	t	#d21919
26	Bières	20.00	2025-07-04 13:22:59.572	2025-07-16 12:40:21.775934	t	#f3d61b
28	Cocktails	20.00	2025-07-04 18:38:29.471	2025-07-16 12:40:57.257347	t	#24d40c
29	Mocktails	20.00	2025-07-05 17:16:09.871	2025-07-16 12:41:25.526352	t	#7f09ce
30	Softs	20.00	2025-07-05 17:20:23.881	2025-07-16 12:41:42.621294	t	#19d27b
31	Vins	20.00	2025-07-05 17:57:44.937	2025-07-16 12:41:57.210596	t	#d34a5f
\.


--
-- Data for Name: closure_bulletins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.closure_bulletins (id, closure_type, period_start, period_end, total_transactions, total_amount, total_vat, vat_breakdown, payment_methods_breakdown, first_sequence, last_sequence, closure_hash, is_closed, closed_at, created_at, tips_total, change_total) FROM stdin;
1	DAILY	2025-07-05 00:00:00	2025-07-05 23:59:59.999	54	880.50	128.07	{"vat_10": {"vat": 4.28, "amount": 47}, "vat_20": {"vat": 67.83, "amount": 407}}	{"card": 721.5, "cash": 24, "split": 135}	1	55	a4535f2cdfea960cd74bef50dd5db86b999a6c8d58891c2f23c779dd2539a414	t	2025-07-05 23:57:43.252	2025-07-05 23:57:43.252	0.00	0.00
2	DAILY	2025-07-09 00:00:00	2025-07-09 23:59:59.999	1	105.00	9.55	{"vat_10": {"vat": 9.55, "amount": 105}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 105}	1	1	0d827d2d456665eef3181697afe609502bd6bed98eaad32270dad0da54e1f46c	t	2025-07-09 12:55:33.12	2025-07-09 12:55:33.120351	0.00	0.00
3	DAILY	2025-07-09 00:00:00	2025-07-09 23:59:59.999	18	569.50	58.23	{"vat_10": {"vat": 44.059999999999995, "amount": 484.5}, "vat_20": {"vat": 14.17, "amount": 85}}	{"card": 561.5, "cash": 8}	1	18	e1953590cf21d25f7d36baa52c95e3a04febeea9551e44af8841f8fcd716d4c2	t	2025-07-09 17:41:33.411	2025-07-09 17:41:33.412311	8.50	79.00
4	DAILY	2025-07-09 00:00:00	2025-07-09 23:59:59.999	18	569.50	58.23	{"vat_10": {"vat": 44.059999999999995, "amount": 484.5}, "vat_20": {"vat": 14.17, "amount": 85}}	{"card": 561.5, "cash": 8}	1	18	e1953590cf21d25f7d36baa52c95e3a04febeea9551e44af8841f8fcd716d4c2	t	2025-07-09 17:43:59.285	2025-07-09 17:43:59.28554	8.50	79.00
5	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 20:32:56.89	2025-07-11 20:32:56.890646	10.00	10.00
6	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 20:44:46.719	2025-07-11 20:44:46.719879	10.00	10.00
7	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 20:45:40.418	2025-07-11 20:45:40.419059	10.00	10.00
8	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 20:49:28.156	2025-07-11 20:49:28.156662	10.00	10.00
9	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 21:10:52.217	2025-07-11 21:10:52.217389	10.00	10.00
10	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 21:12:33.364	2025-07-11 21:12:33.365135	10.00	10.00
12	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 21:26:47.935	2025-07-11 21:26:47.93574	10.00	10.00
13	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 21:27:15.408	2025-07-11 21:27:15.408197	10.00	10.00
14	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 21:27:29.116	2025-07-11 21:27:29.117014	10.00	10.00
15	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 21:28:46.06	2025-07-11 21:28:46.061121	10.00	10.00
16	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 21:47:12.145	2025-07-11 21:47:12.145404	10.00	10.00
17	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 21:47:57.312	2025-07-11 21:47:57.312703	10.00	10.00
18	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 21:48:15.118	2025-07-11 21:48:15.118691	10.00	10.00
19	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 21:48:55.769	2025-07-11 21:48:55.769764	10.00	10.00
20	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 21:54:46.489	2025-07-11 21:54:46.490104	10.00	10.00
21	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 21:55:54.912	2025-07-11 21:55:54.91296	10.00	10.00
22	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 21:57:11.042	2025-07-11 21:57:11.04265	10.00	10.00
23	DAILY	2025-07-11 00:00:00	2025-07-11 23:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	19	26	f9a064f3e4ee353a7eb2ba97dde8c6ec091623b527c2867125208bb29bb85f9b	t	2025-07-11 21:59:21.268	2025-07-11 21:59:21.268839	10.00	10.00
24	DAILY	2025-01-15 02:00:00	2025-01-16 01:59:59.999	0	0.00	0.00	{"vat_10": {"vat": 0, "amount": 0}, "vat_20": {"vat": 0, "amount": 0}}	{"card": 0, "cash": 0}	0	0	e1ea79c8db4d24d2e9c5438868337663317c23dacbb9fdeb703ba3058580c3f2	t	2025-07-12 09:57:40.247	2025-07-12 09:57:40.24804	0.00	0.00
25	DAILY	2025-07-05 02:00:00	2025-07-06 01:59:59.999	54	880.50	128.07	{"vat_10": {"vat": 4.28, "amount": 47}, "vat_20": {"vat": 67.83, "amount": 407}}	{"card": 721.5, "cash": 24}	0	0	16c8afab6571422b947b52bd1d849cd28cdd62fe3566248d7b6fef6c0e186eb6	t	2025-07-12 09:58:06.677	2025-07-12 09:58:06.677359	0.00	0.00
26	DAILY	2025-07-11 02:00:00	2025-07-12 01:59:59.999	8	185.50	20.65	{"vat_10": {"vat": 7.91, "amount": 87}, "vat_20": {"vat": 5.42, "amount": 32.5}}	{"card": 111, "cash": 74.5}	19	26	c05fce7d1fe6234baff4bf7049a1f84306e5ab409a31e157bea5c29f3c6c1b61	t	2025-07-12 10:16:40.794	2025-07-12 10:16:40.794739	10.00	10.00
27	DAILY	2025-07-11 02:00:00	2025-07-12 01:59:59.999	8	185.50	20.65	{"vat_10": {"vat": 7.91, "amount": 87}, "vat_20": {"vat": 5.42, "amount": 32.5}}	{"card": 111, "cash": 74.5}	19	26	c05fce7d1fe6234baff4bf7049a1f84306e5ab409a31e157bea5c29f3c6c1b61	t	2025-07-12 10:57:24.502	2025-07-12 10:57:24.502747	10.00	10.00
28	DAILY	2025-07-12 02:00:00	2025-07-13 01:59:59.999	4	111.50	12.33	{"vat_10": {"vat": 7.5, "amount": 82.5}, "vat_20": {"vat": 4.83, "amount": 29}}	{"card": 44.75, "cash": 66.75}	27	30	35b6a5a29f80530aa022cc0d31d88db3b3ce29691321aed64c4d9274ea47c80b	t	2025-07-12 11:02:34.234	2025-07-12 11:02:34.234252	10.00	10.00
29	DAILY	2025-07-12 02:00:00	2025-07-13 01:59:59.999	4	111.50	12.33	{"vat_10": {"vat": 7.5, "amount": 82.5}, "vat_20": {"vat": 4.83, "amount": 29}}	{"card": 44.75, "cash": 66.75}	27	30	35b6a5a29f80530aa022cc0d31d88db3b3ce29691321aed64c4d9274ea47c80b	t	2025-07-12 12:19:01.977	2025-07-12 12:19:01.978371	10.00	10.00
30	DAILY	2025-07-12 02:00:00	2025-07-13 01:59:59.999	4	111.50	12.33	{"vat_10": {"vat": 7.5, "amount": 82.5}, "vat_20": {"vat": 4.83, "amount": 29}}	{"card": 44.75, "cash": 66.75}	27	30	35b6a5a29f80530aa022cc0d31d88db3b3ce29691321aed64c4d9274ea47c80b	t	2025-07-12 12:28:03.563	2025-07-12 12:28:03.563852	10.00	10.00
31	DAILY	2025-07-12 02:00:00	2025-07-13 01:59:59.999	4	111.50	12.33	{"vat_10": {"vat": 7.5, "amount": 82.5}, "vat_20": {"vat": 4.83, "amount": 29}}	{"card": 54.75, "cash": 56.75}	27	30	35b6a5a29f80530aa022cc0d31d88db3b3ce29691321aed64c4d9274ea47c80b	t	2025-07-12 12:33:50.923	2025-07-12 12:33:50.924099	10.00	10.00
34	WEEKLY	2025-07-07 00:00:00	2025-07-13 23:59:59.999	34	711.00	73.85	{"vat_10": {"vat": 59.46999999999999, "amount": 654}, "vat_20": {"vat": 24.42, "amount": 146.5}}	{"card": 568.25, "cash": 138.75}	0	30	27e7505659426c49b8823d77e1055d112f5805d81aab9cbc9d054178314d866c	t	2025-07-12 12:48:40.589	2025-07-12 12:48:40.589534	28.50	109.00
35	MONTHLY	2025-07-01 00:00:00	2025-07-31 23:59:59.999	88	1591.50	201.92	{"vat_10": {"vat": 63.74999999999999, "amount": 701}, "vat_20": {"vat": 92.25, "amount": 553.5}}	{"card": 1289.75, "cash": 162.75}	0	30	9485b4efa0a4eabf4d345c0401ed70e025385a68ed15f65717aaa3ac1984d25c	t	2025-07-12 12:56:53.854	2025-07-12 12:56:53.854533	28.50	109.00
\.


--
-- Data for Name: closure_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.closure_settings (id, setting_key, setting_value, description, updated_by, updated_at) FROM stdin;
3	timezone	Europe/Paris	Timezone for closure calculations	SYSTEM	2025-07-08 14:28:04.433857
1	daily_closure_time	02:00	Time when daily closure is automatically triggered	SYSTEM	2025-07-11 21:52:55.34532
2	auto_closure_enabled	false	Whether automatic daily closure is enabled	SYSTEM	2025-07-11 21:52:55.355587
4	closure_grace_period_minutes	30	Grace period in minutes before auto-closure	SYSTEM	2025-07-11 21:52:55.358369
\.


--
-- Data for Name: legal_journal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.legal_journal (id, sequence_number, transaction_type, order_id, amount, vat_amount, payment_method, transaction_data, previous_hash, current_hash, "timestamp", user_id, register_id, created_at) FROM stdin;
1	0	ARCHIVE	\N	0.00	0.00	SYSTEM	{"type": "SYSTEM_INIT", "message": "Legal journal initialized", "compliance": "Article 286-I-3 bis du CGI"}	0000000000000000000000000000000000000000000000000000000000000000	a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3	2025-07-08 13:05:09.88861	\N	MUSEBAR-REG-001	2025-07-08 13:05:09.88861
6	1	SALE	58	105.00	9.55	card	{"items": [{"id": 136, "order_id": 58, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T10:55:09.660Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 137, "order_id": 58, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T10:55:09.673Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 138, "order_id": 58, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T10:55:09.677Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 139, "order_id": 58, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T10:55:09.681Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 140, "order_id": 58, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T10:55:09.686Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 58, "timestamp": "2025-07-09T10:55:09.655Z", "register_id": "MUSEBAR-REG-001"}	a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3	45ee112d951dc6d698b4cc346b5ec898218fa440722cc8b55103c24de129ec30	2025-07-09 12:55:09.692	\N	MUSEBAR-REG-001	2025-07-09 12:55:09.692721
8	2	SALE	60	8.00	0.73	card	{"items": [{"id": 146, "order_id": 60, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T11:07:42.791Z", "product_id": 104, "tax_amount": "0.73", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 60, "timestamp": "2025-07-09T11:07:42.780Z", "register_id": "MUSEBAR-REG-001"}	45ee112d951dc6d698b4cc346b5ec898218fa440722cc8b55103c24de129ec30	53c231e6270ce829e5ba80a27dd9cd25765bcbf7d387517d7a4b7a096726564d	2025-07-09 13:07:42.805	\N	MUSEBAR-REG-001	2025-07-09 13:07:42.80673
9	3	SALE	61	126.00	11.45	card	{"items": [{"id": 147, "order_id": 61, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T11:15:51.227Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 148, "order_id": 61, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T11:15:51.235Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 149, "order_id": 61, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T11:15:51.243Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 150, "order_id": 61, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T11:15:51.251Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 151, "order_id": 61, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T11:15:51.259Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 152, "order_id": 61, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T11:15:51.267Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 61, "timestamp": "2025-07-09T11:15:51.219Z", "register_id": "MUSEBAR-REG-001"}	53c231e6270ce829e5ba80a27dd9cd25765bcbf7d387517d7a4b7a096726564d	b03f584675567e36d9a4b3b3bbb45f5a42062424b5f6a35dd584cdeb47017936	2025-07-09 13:15:51.276	\N	MUSEBAR-REG-001	2025-07-09 13:15:51.276588
10	4	SALE	62	105.00	9.55	card	{"items": [{"id": 153, "order_id": 62, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T11:17:26.541Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 154, "order_id": 62, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T11:17:26.550Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 155, "order_id": 62, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T11:17:26.554Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 156, "order_id": 62, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T11:17:26.557Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 157, "order_id": 62, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T11:17:26.560Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 62, "timestamp": "2025-07-09T11:17:26.537Z", "register_id": "MUSEBAR-REG-001"}	b03f584675567e36d9a4b3b3bbb45f5a42062424b5f6a35dd584cdeb47017936	a9791f2e56b984bfaf950f78ec884051eaaa91b9b500377fa2cf85aa191ec037	2025-07-09 13:17:26.569	\N	MUSEBAR-REG-001	2025-07-09 13:17:26.570768
11	5	SALE	63	63.00	5.73	card	{"items": [{"id": 158, "order_id": 63, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T11:20:53.399Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 159, "order_id": 63, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T11:20:53.405Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 160, "order_id": 63, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T11:20:53.409Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 63, "timestamp": "2025-07-09T11:20:53.386Z", "register_id": "MUSEBAR-REG-001"}	a9791f2e56b984bfaf950f78ec884051eaaa91b9b500377fa2cf85aa191ec037	f8c440858fc1c5b4d4a72f16f3c138e103262618e54fb0c5c602754388813aab	2025-07-09 13:20:53.415	\N	MUSEBAR-REG-001	2025-07-09 13:20:53.416361
12	6	SALE	64	32.50	5.42	card	{"items": [{"id": 161, "order_id": 64, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-09T11:22:24.262Z", "product_id": 94, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Bellini", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 162, "order_id": 64, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-09T11:22:24.267Z", "product_id": 94, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Bellini", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 163, "order_id": 64, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-09T11:22:24.270Z", "product_id": 94, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Bellini", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 164, "order_id": 64, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-09T11:22:24.274Z", "product_id": 94, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Bellini", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 165, "order_id": 64, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-09T11:22:24.277Z", "product_id": 94, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Bellini", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 64, "timestamp": "2025-07-09T11:22:24.257Z", "register_id": "MUSEBAR-REG-001"}	f8c440858fc1c5b4d4a72f16f3c138e103262618e54fb0c5c602754388813aab	2d87076b2481c8a0ee4e21b8d2fdec89c003b8215bc093cf7175355bead487bd	2025-07-09 13:22:24.283	\N	MUSEBAR-REG-001	2025-07-09 13:22:24.283475
13	7	SALE	65	7.50	1.25	card	{"items": [{"id": 166, "order_id": 65, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-09T12:21:41.010Z", "product_id": 56, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 65, "timestamp": "2025-07-09T12:21:41.000Z", "register_id": "MUSEBAR-REG-001"}	2d87076b2481c8a0ee4e21b8d2fdec89c003b8215bc093cf7175355bead487bd	5d99c0585b451304c515118490994def62681038adb5013e45379443e372f8ba	2025-07-09 14:21:41.019	\N	MUSEBAR-REG-001	2025-07-09 14:21:41.0208
14	8	SALE	66	8.00	0.73	card	{"items": [{"id": 167, "order_id": 66, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T12:51:48.823Z", "product_id": 104, "tax_amount": "0.73", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 66, "timestamp": "2025-07-09T12:51:48.817Z", "register_id": "MUSEBAR-REG-001"}	5d99c0585b451304c515118490994def62681038adb5013e45379443e372f8ba	1ce804a5f2951b34946377b0f2e1caf53bfabb3a8800f6e4155833b0638cef5d	2025-07-09 14:51:48.849	\N	MUSEBAR-REG-001	2025-07-09 14:51:48.850661
15	9	SALE	67	21.00	1.91	card	{"items": [{"id": 168, "order_id": 67, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T12:53:27.521Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 67, "timestamp": "2025-07-09T12:53:27.517Z", "register_id": "MUSEBAR-REG-001"}	1ce804a5f2951b34946377b0f2e1caf53bfabb3a8800f6e4155833b0638cef5d	43f6d813a29b31c672887e3a9a8aaa490c8c7d5144d952fd75e1e13c88f139c4	2025-07-09 14:53:27.528	\N	MUSEBAR-REG-001	2025-07-09 14:53:27.528772
16	10	SALE	68	6.50	0.59	card	{"items": [{"id": 169, "order_id": 68, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T12:54:08.287Z", "product_id": 105, "tax_amount": "0.59", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 68, "timestamp": "2025-07-09T12:54:08.282Z", "register_id": "MUSEBAR-REG-001"}	43f6d813a29b31c672887e3a9a8aaa490c8c7d5144d952fd75e1e13c88f139c4	7b9098def0778ff97bfd1e233d8ff0bdb28e4c106220546654ce8796b216df34	2025-07-09 14:54:08.295	\N	MUSEBAR-REG-001	2025-07-09 14:54:08.296364
17	11	SALE	69	21.00	1.91	card	{"items": [{"id": 170, "order_id": 69, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T13:03:27.118Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 69, "timestamp": "2025-07-09T13:03:27.113Z", "register_id": "MUSEBAR-REG-001"}	7b9098def0778ff97bfd1e233d8ff0bdb28e4c106220546654ce8796b216df34	d8a52636a076f3fae870753575b98d94c574f579f7b773ca5f4e2d9b0fccc556	2025-07-09 15:03:27.126	\N	MUSEBAR-REG-001	2025-07-09 15:03:27.126467
18	12	SALE	71	10.00	1.67	card	{"items": [{"id": 172, "order_id": 71, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-09T14:32:45.895Z", "product_id": 37, "tax_amount": "1.67", "unit_price": "10.00", "sub_bill_id": null, "total_price": "10.00", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 71, "timestamp": "2025-07-09T14:32:45.891Z", "register_id": "MUSEBAR-REG-001"}	d8a52636a076f3fae870753575b98d94c574f579f7b773ca5f4e2d9b0fccc556	54ce6c614d49695175b1948be7c30b71095efd7e369cad9ab116b420904b4b1e	2025-07-09 16:32:45.906	\N	MUSEBAR-REG-001	2025-07-09 16:32:45.90673
19	13	SALE	72	5.00	0.83	card	{"items": [{"id": 173, "order_id": 72, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-09T14:44:58.864Z", "product_id": 37, "tax_amount": "0.83", "unit_price": "5.00", "sub_bill_id": null, "total_price": "5.00", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 72, "timestamp": "2025-07-09T14:44:58.860Z", "register_id": "MUSEBAR-REG-001"}	54ce6c614d49695175b1948be7c30b71095efd7e369cad9ab116b420904b4b1e	43bb364c99863fe283f6e5f19a80cecff91492f44bef0d2aeed9a5b319ded207	2025-07-09 16:44:58.87	\N	MUSEBAR-REG-001	2025-07-09 16:44:58.870485
20	14	SALE	73	3.00	0.50	card	{"items": [{"id": 174, "order_id": 73, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-09T14:46:19.351Z", "product_id": 37, "tax_amount": "0.50", "unit_price": "3.00", "sub_bill_id": null, "total_price": "3.00", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 73, "timestamp": "2025-07-09T14:46:19.347Z", "register_id": "MUSEBAR-REG-001"}	43bb364c99863fe283f6e5f19a80cecff91492f44bef0d2aeed9a5b319ded207	6ef26540d5a06bc1154fb05e734ec4b777a002a2bca8fe40c05b4b7ace935678	2025-07-09 16:46:19.357	\N	MUSEBAR-REG-001	2025-07-09 16:46:19.357444
21	15	SALE	74	4.00	0.67	card	{"items": [{"id": 175, "order_id": 74, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-09T14:47:05.756Z", "product_id": 37, "tax_amount": "0.67", "unit_price": "4.00", "sub_bill_id": null, "total_price": "4.00", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 74, "timestamp": "2025-07-09T14:47:05.742Z", "register_id": "MUSEBAR-REG-001"}	6ef26540d5a06bc1154fb05e734ec4b777a002a2bca8fe40c05b4b7ace935678	41e0b0f7c8b83be3d82ff5530d3c4b6149c323f5c0b5c31dea161d6c0e58a1b0	2025-07-09 16:47:05.769	\N	MUSEBAR-REG-001	2025-07-09 16:47:05.77096
22	16	SALE	75	15.00	2.50	card	{"items": [{"id": 176, "order_id": 75, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-09T14:47:39.721Z", "product_id": 37, "tax_amount": "2.50", "unit_price": "15.00", "sub_bill_id": null, "total_price": "15.00", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 75, "timestamp": "2025-07-09T14:47:39.714Z", "register_id": "MUSEBAR-REG-001"}	41e0b0f7c8b83be3d82ff5530d3c4b6149c323f5c0b5c31dea161d6c0e58a1b0	88c4adf6cc669767997a581ed6c55b8efc1d4ad63b1d81e593196e6654771cf9	2025-07-09 16:47:39.731	\N	MUSEBAR-REG-001	2025-07-09 16:47:39.732834
23	17	SALE	76	8.00	1.33	cash	{"items": [{"id": 177, "order_id": 76, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-09T14:47:45.068Z", "product_id": 37, "tax_amount": "1.33", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Romarin", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 76, "timestamp": "2025-07-09T14:47:45.057Z", "register_id": "MUSEBAR-REG-001"}	88c4adf6cc669767997a581ed6c55b8efc1d4ad63b1d81e593196e6654771cf9	75c3fd4b743aed33154de514bc6474b4645237b3d3b966703c6744fc97941806	2025-07-09 16:47:45.072	\N	MUSEBAR-REG-001	2025-07-09 16:47:45.073103
24	18	SALE	77	21.00	1.91	card	{"items": [{"id": 178, "order_id": 77, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-09T14:56:58.878Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 77, "timestamp": "2025-07-09T14:56:58.867Z", "register_id": "MUSEBAR-REG-001"}	75c3fd4b743aed33154de514bc6474b4645237b3d3b966703c6744fc97941806	f9af6b88bd02bbdfd59df3c883195733b63a4e06939ee173903a0f7a96ae158f	2025-07-09 16:56:58.891	\N	MUSEBAR-REG-001	2025-07-09 16:56:58.89212
25	19	SALE	81	42.00	3.82	split	{"items": [{"id": 179, "order_id": 81, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-11T16:34:39.179Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 180, "order_id": 81, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-11T16:34:39.184Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 81, "timestamp": "2025-07-11T16:34:39.173Z", "register_id": "MUSEBAR-REG-001"}	f9af6b88bd02bbdfd59df3c883195733b63a4e06939ee173903a0f7a96ae158f	35cf5aa0dd449dab528e9a66690dcef290bf2d2c0e415a8292c3850ad23e377b	2025-07-11 18:34:39.196	\N	MUSEBAR-REG-001	2025-07-11 18:34:39.196546
44	35	SALE	101	10.00	0.91	card	{"items": [{"id": 219, "order_id": 101, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-20T12:01:56.652Z", "product_id": 104, "tax_amount": "0.73", "unit_price": "8.00", "description": null, "sub_bill_id": null, "total_price": "8.00", "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 220, "order_id": 101, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-20T12:01:56.660Z", "product_id": null, "tax_amount": "0.18", "unit_price": "2.00", "description": null, "sub_bill_id": null, "total_price": "2.00", "product_name": "Divers", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 101, "timestamp": "2025-07-20T12:01:56.647Z", "register_id": "MUSEBAR-REG-001"}	4173c5c979772cd43dce155c1b9178f67ed860c75a63aeb2c86a93b8f84cec4c	33c978eef30926a1ffd00fe5b7d97c826619a84085b0c5f032503cb5630b349c	2025-07-20 14:01:56.677	1	MUSEBAR-REG-001	2025-07-20 14:01:56.677628
26	20	SALE	83	19.50	3.25	split	{"items": [{"id": 181, "order_id": 83, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-11T16:35:38.814Z", "product_id": 41, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Blanche", "happy_hour_applied": true, "happy_hour_discount_amount": "1.63"}, {"id": 182, "order_id": 83, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-11T16:35:38.820Z", "product_id": 41, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Blanche", "happy_hour_applied": true, "happy_hour_discount_amount": "1.63"}, {"id": 183, "order_id": 83, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-11T16:35:38.827Z", "product_id": 41, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Blanche", "happy_hour_applied": true, "happy_hour_discount_amount": "1.63"}], "order_id": 83, "timestamp": "2025-07-11T16:35:38.797Z", "register_id": "MUSEBAR-REG-001"}	35cf5aa0dd449dab528e9a66690dcef290bf2d2c0e415a8292c3850ad23e377b	1b960ca992eb2ee30817851c67292ca6df801db093f3b8aa979c496480acadb7	2025-07-11 18:35:38.846	\N	MUSEBAR-REG-001	2025-07-11 18:35:38.846745
27	21	SALE	84	53.00	5.65	card	{"items": [{"id": 184, "order_id": 84, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-11T16:36:22.245Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 185, "order_id": 84, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-11T16:36:22.250Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 186, "order_id": 84, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-11T16:36:22.253Z", "product_id": 96, "tax_amount": "0.92", "unit_price": "5.50", "sub_bill_id": null, "total_price": "5.50", "product_name": "Menthe Pastille/Get", "happy_hour_applied": true, "happy_hour_discount_amount": "1.38"}, {"id": 187, "order_id": 84, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-11T16:36:22.257Z", "product_id": 96, "tax_amount": "0.92", "unit_price": "5.50", "sub_bill_id": null, "total_price": "5.50", "product_name": "Menthe Pastille/Get", "happy_hour_applied": true, "happy_hour_discount_amount": "1.38"}], "order_id": 84, "timestamp": "2025-07-11T16:36:22.233Z", "register_id": "MUSEBAR-REG-001"}	1b960ca992eb2ee30817851c67292ca6df801db093f3b8aa979c496480acadb7	e72a780c25ac3ccdb4ee7508a9929d0261ad4f89798d7258e2b64e520d29ead9	2025-07-11 18:36:22.263	\N	MUSEBAR-REG-001	2025-07-11 18:36:22.264835
28	22	SALE	85	16.00	1.45	cash	{"items": [{"id": 188, "order_id": 85, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-11T16:36:33.092Z", "product_id": 104, "tax_amount": "0.73", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 189, "order_id": 85, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-11T16:36:33.096Z", "product_id": 104, "tax_amount": "0.73", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 85, "timestamp": "2025-07-11T16:36:33.087Z", "register_id": "MUSEBAR-REG-001"}	e72a780c25ac3ccdb4ee7508a9929d0261ad4f89798d7258e2b64e520d29ead9	8930d31558a2c5adc3eaed4efb3c80b6db51579b98a56d7ff65ec936e322a088	2025-07-11 18:36:33.103	\N	MUSEBAR-REG-001	2025-07-11 18:36:33.104247
29	23	SALE	86	13.00	2.17	split	{"items": [{"id": 190, "order_id": 86, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-11T17:08:19.138Z", "product_id": 95, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Americano", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 191, "order_id": 86, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-11T17:08:19.144Z", "product_id": 95, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Americano", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 86, "timestamp": "2025-07-11T17:08:19.132Z", "register_id": "MUSEBAR-REG-001"}	8930d31558a2c5adc3eaed4efb3c80b6db51579b98a56d7ff65ec936e322a088	9dae99db10e66ff6e1bf5a51a356f9bf93777e13a6791cdeac3afe1f8fa75b7f	2025-07-11 19:08:19.158	\N	MUSEBAR-REG-001	2025-07-11 19:08:19.159314
30	24	SALE	87	13.00	1.67	split	{"items": [{"id": 192, "order_id": 87, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-11T17:09:27.595Z", "product_id": 96, "tax_amount": "1.08", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Menthe Pastille/Get", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 193, "order_id": 87, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-11T17:09:27.602Z", "product_id": 105, "tax_amount": "0.59", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 87, "timestamp": "2025-07-11T17:09:27.583Z", "register_id": "MUSEBAR-REG-001"}	9dae99db10e66ff6e1bf5a51a356f9bf93777e13a6791cdeac3afe1f8fa75b7f	ed6e1e800c9d9314a5584d94ee8172284bfe0d5cbbc9f02d2d505b95685cd4cc	2025-07-11 19:09:27.617	\N	MUSEBAR-REG-001	2025-07-11 19:09:27.618002
31	25	SALE	88	21.00	1.91	cash	{"items": [{"id": 194, "order_id": 88, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-11T17:25:21.843Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 88, "timestamp": "2025-07-11T17:25:21.832Z", "register_id": "MUSEBAR-REG-001"}	ed6e1e800c9d9314a5584d94ee8172284bfe0d5cbbc9f02d2d505b95685cd4cc	b36acb859ab3634de9373c277c1e1f0d5a055418c2b44c1dcb7b5a8cba3707f3	2025-07-11 19:25:21.851	\N	MUSEBAR-REG-001	2025-07-11 19:25:21.852589
32	26	SALE	89	8.00	0.73	cash	{"items": [{"id": 195, "order_id": 89, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-11T17:27:14.919Z", "product_id": 104, "tax_amount": "0.73", "unit_price": "8.00", "sub_bill_id": null, "total_price": "8.00", "product_name": "Focaccia ", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 89, "timestamp": "2025-07-11T17:27:14.913Z", "register_id": "MUSEBAR-REG-001"}	b36acb859ab3634de9373c277c1e1f0d5a055418c2b44c1dcb7b5a8cba3707f3	2f4b216f67a45073f9109f81fb4c5aa4e66daf46357deb7d7164b981519087ce	2025-07-11 19:27:14.932	\N	MUSEBAR-REG-001	2025-07-11 19:27:14.933222
35	27	SALE	90	63.00	5.73	split	{"items": [{"id": 196, "order_id": 90, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-12T09:00:58.971Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 197, "order_id": 90, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-12T09:00:58.977Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 198, "order_id": 90, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-12T09:00:58.980Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 90, "timestamp": "2025-07-12T09:00:58.958Z", "register_id": "MUSEBAR-REG-001"}	2f4b216f67a45073f9109f81fb4c5aa4e66daf46357deb7d7164b981519087ce	138b33368c46460df09a966dbf660be6c2d33db3caee094c55dc60bba0eb8f69	2025-07-12 11:00:58.993	\N	MUSEBAR-REG-001	2025-07-12 11:00:58.994154
36	28	SALE	91	19.50	1.77	split	{"items": [{"id": 199, "order_id": 91, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-12T09:01:11.417Z", "product_id": 105, "tax_amount": "0.59", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 200, "order_id": 91, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-12T09:01:11.422Z", "product_id": 105, "tax_amount": "0.59", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 201, "order_id": 91, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-12T09:01:11.425Z", "product_id": 105, "tax_amount": "0.59", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 91, "timestamp": "2025-07-12T09:01:11.405Z", "register_id": "MUSEBAR-REG-001"}	138b33368c46460df09a966dbf660be6c2d33db3caee094c55dc60bba0eb8f69	d8af74c4d5d87c46e0a790cca68fcd76f060ff679bb0af505c621ac96e778174	2025-07-12 11:01:11.44	\N	MUSEBAR-REG-001	2025-07-12 11:01:11.441039
37	29	SALE	92	15.00	2.50	card	{"items": [{"id": 202, "order_id": 92, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-12T09:01:22.548Z", "product_id": 56, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 203, "order_id": 92, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-12T09:01:22.555Z", "product_id": 56, "tax_amount": "1.25", "unit_price": "7.50", "sub_bill_id": null, "total_price": "7.50", "product_name": "Bière du Moment", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 92, "timestamp": "2025-07-12T09:01:22.536Z", "register_id": "MUSEBAR-REG-001"}	d8af74c4d5d87c46e0a790cca68fcd76f060ff679bb0af505c621ac96e778174	e7682830e3fea7df8582afe6cb9ee96463bbdc887c01b9665ea684f3c21762e7	2025-07-12 11:01:22.561	\N	MUSEBAR-REG-001	2025-07-12 11:01:22.562198
38	30	SALE	93	14.00	2.33	cash	{"items": [{"id": 204, "order_id": 93, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-12T09:01:31.620Z", "product_id": 101, "tax_amount": "1.17", "unit_price": "7.00", "sub_bill_id": null, "total_price": "7.00", "product_name": "Bière Sirop", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 205, "order_id": 93, "quantity": 1, "tax_rate": "20.00", "created_at": "2025-07-12T09:01:31.636Z", "product_id": 101, "tax_amount": "1.17", "unit_price": "7.00", "sub_bill_id": null, "total_price": "7.00", "product_name": "Bière Sirop", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 93, "timestamp": "2025-07-12T09:01:31.608Z", "register_id": "MUSEBAR-REG-001"}	e7682830e3fea7df8582afe6cb9ee96463bbdc887c01b9665ea684f3c21762e7	d336982e102b5d1d00b8ad9a1a87ad8b3d9da41995aa54492e48c281d7eb9859	2025-07-12 11:01:31.644	\N	MUSEBAR-REG-001	2025-07-12 11:01:31.644891
39	31	SALE	95	105.00	9.55	card	{"items": [{"id": 206, "order_id": 95, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-12T11:13:49.441Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 207, "order_id": 95, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-12T11:13:49.454Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 208, "order_id": 95, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-12T11:13:49.460Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 209, "order_id": 95, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-12T11:13:49.466Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}, {"id": 210, "order_id": 95, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-12T11:13:49.471Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 95, "timestamp": "2025-07-12T11:13:49.434Z", "register_id": "MUSEBAR-REG-001"}	d336982e102b5d1d00b8ad9a1a87ad8b3d9da41995aa54492e48c281d7eb9859	c5e4fd998ae015d562203b0a4da419ffae4a2b1b22d8793e117fbeca72145456	2025-07-12 13:13:49.479	\N	MUSEBAR-REG-001	2025-07-12 13:13:49.479895
40	32	SALE	96	21.00	1.91	card	{"items": [{"id": 211, "order_id": 96, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-12T11:19:59.102Z", "product_id": 103, "tax_amount": "1.91", "unit_price": "21.00", "sub_bill_id": null, "total_price": "21.00", "product_name": "Planche", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 96, "timestamp": "2025-07-12T11:19:59.094Z", "register_id": "MUSEBAR-REG-001"}	c5e4fd998ae015d562203b0a4da419ffae4a2b1b22d8793e117fbeca72145456	06642c5b2297865753e895a1649ba2e2460f0c63901282724fc7c63c043feef2	2025-07-12 13:19:59.115	\N	MUSEBAR-REG-001	2025-07-12 13:19:59.116137
41	33	SALE	97	6.50	0.59	card	{"items": [{"id": 212, "order_id": 97, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-12T11:20:27.090Z", "product_id": 105, "tax_amount": "0.59", "unit_price": "6.50", "sub_bill_id": null, "total_price": "6.50", "product_name": "Saucisson", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 97, "timestamp": "2025-07-12T11:20:27.085Z", "register_id": "MUSEBAR-REG-001"}	06642c5b2297865753e895a1649ba2e2460f0c63901282724fc7c63c043feef2	88ec3bec9632340005ea4655c647d59235498b9ac67f38d63e66c427733fd120	2025-07-12 13:20:27.096	\N	MUSEBAR-REG-001	2025-07-12 13:20:27.096837
43	34	SALE	100	2.00	0.18	card	{"items": [{"id": 218, "order_id": 100, "quantity": 1, "tax_rate": "10.00", "created_at": "2025-07-20T12:01:27.202Z", "product_id": null, "tax_amount": "0.18", "unit_price": "2.00", "description": null, "sub_bill_id": null, "total_price": "2.00", "product_name": "Divers", "happy_hour_applied": false, "happy_hour_discount_amount": "0.00"}], "order_id": 100, "timestamp": "2025-07-20T12:01:27.164Z", "register_id": "MUSEBAR-REG-001"}	88ec3bec9632340005ea4655c647d59235498b9ac67f38d63e66c427733fd120	4173c5c979772cd43dce155c1b9178f67ed860c75a63aeb2c86a93b8f84cec4c	2025-07-20 14:01:27.212	1	MUSEBAR-REG-001	2025-07-20 14:01:27.213441
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price, tax_rate, tax_amount, happy_hour_applied, happy_hour_discount_amount, sub_bill_id, created_at, description) FROM stdin;
1	1	40	Triple	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 17:15:08.335	\N
2	2	41	Blanche	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 17:15:21.783	\N
3	2	42	Spritz Sureau	1	7.00	7.00	20.00	1.17	t	1.75	\N	2025-07-05 17:15:21.788	\N
4	3	44	Bissap	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 17:22:25.84	\N
5	3	43	Dry Quiri	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 17:22:25.855	\N
6	4	39	IPA	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 17:23:06.002	\N
7	4	45	Ginger	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 17:23:06.008	\N
8	5	47	Blonde de Soif	1	3.50	3.50	20.00	0.58	f	0.00	\N	2025-07-05 17:41:47.188	\N
9	5	60	Coca	1	3.00	3.00	10.00	0.27	t	0.75	\N	2025-07-05 17:41:47.198	\N
10	6	77	Sirop	1	2.00	2.00	10.00	0.18	f	0.00	\N	2025-07-05 17:53:54.652	\N
11	6	51	Triple	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 17:53:54.659	\N
12	6	76	Citronnade	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 17:53:54.663	\N
13	7	39	IPA	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 17:55:33.87	\N
14	7	46	Blonde de Soif	1	5.00	5.00	20.00	0.83	t	1.25	\N	2025-07-05 17:55:33.89	\N
15	8	76	Citronnade	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 18:30:42.506	\N
16	8	44	Bissap	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 18:30:42.525	\N
17	9	47	Blonde de Soif	1	3.50	3.50	20.00	0.58	f	0.00	\N	2025-07-05 18:36:03.611	\N
18	10	44	Bissap	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 18:45:06.385	\N
19	10	73	Jus de Pomme Pétillant	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 18:45:06.391	\N
20	10	76	Citronnade	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 18:45:06.395	\N
21	10	44	Bissap	1	4.50	4.50	10.00	0.41	t	1.13	\N	2025-07-05 18:45:06.399	\N
22	10	66	Caïpi	1	6.00	6.00	20.00	1.00	t	1.50	\N	2025-07-05 18:45:06.404	\N
23	10	66	Caïpi	1	6.00	6.00	20.00	1.00	t	1.50	\N	2025-07-05 18:45:06.407	\N
24	10	65	Cocktail du moment	1	7.00	7.00	20.00	1.17	t	1.75	\N	2025-07-05 18:45:06.412	\N
25	11	39	IPA	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 18:49:00.049	\N
26	11	39	IPA	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 18:49:00.067	\N
27	11	46	Blonde de Soif	1	5.00	5.00	20.00	0.83	t	1.25	\N	2025-07-05 18:49:00.071	\N
28	12	40	Triple	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 18:57:28.088	\N
29	13	105	Saucisson	1	6.50	6.50	10.00	0.59	f	0.00	\N	2025-07-05 18:59:51.514	\N
30	13	65	Cocktail du moment	1	7.00	7.00	20.00	1.17	t	1.75	\N	2025-07-05 18:59:51.519	\N
31	13	40	Triple	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 18:59:51.524	\N
32	14	52	NEIPA	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 19:00:13.924	\N
33	14	52	NEIPA	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-05 19:00:13.937	\N
34	15	53	NEIPA	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 19:08:33.347	\N
35	15	47	Blonde de Soif	1	3.50	3.50	20.00	0.58	f	0.00	\N	2025-07-05 19:08:33.372	\N
36	15	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-05 19:08:33.38	\N
37	15	68	Espresso Martini	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 19:08:33.383	\N
38	15	85	Chardo	1	5.50	5.50	20.00	0.92	f	0.00	\N	2025-07-05 19:08:33.386	\N
39	16	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:20:46.072	\N
40	16	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:20:46.082	\N
41	16	43	Dry Quiri	1	5.50	5.50	10.00	0.50	f	0.00	\N	2025-07-05 19:20:46.089	\N
42	16	57	Bière du Moment	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 19:20:46.093	\N
43	17	104	Focaccia 	1	8.00	8.00	10.00	0.73	f	0.00	\N	2025-07-05 19:21:05.227	\N
44	18	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:23:12.05	\N
45	18	40	Triple	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:23:12.069	\N
46	18	61	Spritz Apérol	1	7.00	7.00	20.00	1.17	f	0.00	\N	2025-07-05 19:23:12.072	\N
47	19	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:37:57.258	\N
48	19	40	Triple	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:37:57.267	\N
49	20	64	Amaretto Stormy	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 19:41:26.171	\N
50	20	74	London Mule	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 19:41:26.176	\N
51	21	66	Caïpi	1	7.00	7.00	20.00	1.17	f	0.00	\N	2025-07-05 19:48:01.076	\N
52	21	64	Amaretto Stormy	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 19:48:01.082	\N
53	22	56	Bière du Moment	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:51:10.475	\N
54	22	56	Bière du Moment	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:51:10.483	\N
55	23	104	Focaccia 	1	8.00	8.00	10.00	0.73	f	0.00	\N	2025-07-05 19:58:32.636	\N
56	23	40	Triple	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 19:58:32.641	\N
57	23	95	Americano	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-05 19:58:32.645	\N
58	24	49	IPA	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 20:01:48.575	\N
59	25	39	IPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:07:17.532	\N
60	25	56	Bière du Moment	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:07:17.55	\N
61	26	53	NEIPA	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 20:07:55.457	\N
62	27	39	IPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:09:52.576	\N
63	28	52	NEIPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:24:33.957	\N
64	28	85	Chardo	1	5.50	5.50	20.00	0.92	f	0.00	\N	2025-07-05 20:24:33.964	\N
65	29	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:28:08.255	\N
66	29	61	Spritz Apérol	1	7.00	7.00	20.00	1.17	f	0.00	\N	2025-07-05 20:28:08.26	\N
67	30	95	Americano	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-05 20:28:40.604	\N
68	30	40	Triple	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:28:40.61	\N
69	31	40	Triple	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:31:15.367	\N
70	31	39	IPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:31:15.372	\N
71	32	50	Romarin	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 20:31:26.253	\N
72	32	55	Rouge	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 20:31:26.258	\N
73	33	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:34:06.532	\N
74	34	87	Uby 3	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-05 20:35:14.032	\N
75	35	39	IPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:36:59.733	\N
76	35	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:36:59.738	\N
77	35	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:36:59.742	\N
78	35	39	IPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:36:59.746	\N
79	35	47	Blonde de Soif	1	3.50	3.50	20.00	0.58	f	0.00	\N	2025-07-05 20:36:59.752	\N
80	35	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-05 20:36:59.755	\N
81	36	107	Ti Punch	1	7.00	7.00	20.00	1.17	f	0.00	\N	2025-07-05 20:51:24.172	\N
82	36	40	Triple	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 20:51:24.178	\N
83	37	106	Blanche	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 21:07:16.554	\N
84	38	106	Blanche	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 21:10:21.269	\N
85	38	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 21:10:21.275	\N
86	38	40	Triple	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 21:10:21.279	\N
87	38	73	Jus de Pomme Pétillant	1	5.50	5.50	10.00	0.50	f	0.00	\N	2025-07-05 21:10:21.283	\N
88	38	73	Jus de Pomme Pétillant	1	5.50	5.50	10.00	0.50	f	0.00	\N	2025-07-05 21:10:21.287	\N
89	38	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-05 21:10:21.291	\N
90	38	105	Saucisson	1	6.50	6.50	10.00	0.59	f	0.00	\N	2025-07-05 21:10:21.295	\N
91	39	58	Picon	1	7.00	7.00	20.00	1.17	f	0.00	\N	2025-07-05 21:28:30.937	\N
92	39	46	Blonde de Soif	1	6.00	6.00	20.00	1.00	f	0.00	\N	2025-07-05 21:28:30.943	\N
93	39	52	NEIPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 21:28:30.947	\N
94	39	81	CDR	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-05 21:28:30.951	\N
95	39	104	Focaccia 	1	8.00	8.00	10.00	0.73	f	0.00	\N	2025-07-05 21:28:30.954	\N
96	40	83	Blaye	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-05 21:30:46.469	\N
97	40	85	Chardo	1	5.50	5.50	20.00	0.92	f	0.00	\N	2025-07-05 21:30:46.479	\N
98	41	51	Triple	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 21:32:05.647	\N
99	42	51	Triple	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 21:35:43.135	\N
100	42	104	Focaccia 	1	8.00	8.00	10.00	0.73	f	0.00	\N	2025-07-05 21:35:43.141	\N
101	42	104	Focaccia 	1	8.00	8.00	10.00	0.73	f	0.00	\N	2025-07-05 21:35:43.145	\N
102	42	81	CDR	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-05 21:35:43.149	\N
103	42	89	Uby 4	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-05 21:35:43.153	\N
104	43	64	Amaretto Stormy	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 21:42:55.36	\N
105	44	39	IPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 22:09:49.177	\N
106	45	57	Bière du Moment	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 22:11:16.976	\N
107	45	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 22:11:16.984	\N
108	46	57	Bière du Moment	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 22:11:53.953	\N
109	46	39	IPA	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 22:11:53.966	\N
110	47	64	Amaretto Stormy	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 22:12:44.153	\N
111	47	64	Amaretto Stormy	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 22:12:44.159	\N
112	47	64	Amaretto Stormy	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 22:12:44.174	\N
113	48	64	Amaretto Stormy	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 22:17:23.264	\N
114	49	65	Cocktail du moment	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-05 22:28:11.081	\N
115	49	46	Blonde de Soif	1	6.00	6.00	20.00	1.00	f	0.00	\N	2025-07-05 22:28:11.111	\N
116	49	46	Blonde de Soif	1	6.00	6.00	20.00	1.00	f	0.00	\N	2025-07-05 22:28:11.114	\N
117	49	43	Dry Quiri	1	5.50	5.50	10.00	0.50	f	0.00	\N	2025-07-05 22:28:11.118	\N
118	49	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-05 22:28:11.122	\N
119	50	76	Citronnade	1	5.50	5.50	10.00	0.50	f	0.00	\N	2025-07-05 22:28:46.385	\N
120	50	43	Dry Quiri	1	5.50	5.50	10.00	0.50	f	0.00	\N	2025-07-05 22:28:46.39	\N
121	50	49	IPA	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 22:28:46.394	\N
122	50	44	Bissap	1	5.50	5.50	10.00	0.50	f	0.00	\N	2025-07-05 22:28:46.397	\N
123	51	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-05 22:29:43.285	\N
124	52	89	Uby 4	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-05 22:39:00.118	\N
125	52	50	Romarin	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 22:39:00.124	\N
126	52	51	Triple	1	4.50	4.50	20.00	0.75	f	0.00	\N	2025-07-05 22:39:00.128	\N
127	53	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 22:59:52.202	\N
128	54	37	Romarin	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-05 23:29:51.132	\N
129	55	64	[ANNULATION] Amaretto Stormy	-1	8.00	-8.00	20.00	-1.33	f	0.00	\N	2025-07-09 12:29:27.472512	\N
130	56	39	[ANNULATION] IPA	-1	7.50	-7.50	20.00	-1.25	f	0.00	\N	2025-07-09 12:35:48.560667	\N
131	57	58	[ANNULATION] Picon	-1	7.00	-7.00	20.00	-1.17	f	0.00	\N	2025-07-09 12:54:30.792682	\N
132	57	46	[ANNULATION] Blonde de Soif	-1	6.00	-6.00	20.00	-1.00	f	0.00	\N	2025-07-09 12:54:30.81561	\N
133	57	52	[ANNULATION] NEIPA	-1	7.50	-7.50	20.00	-1.25	f	0.00	\N	2025-07-09 12:54:30.818829	\N
134	57	81	[ANNULATION] CDR	-1	6.50	-6.50	20.00	-1.08	f	0.00	\N	2025-07-09 12:54:30.821803	\N
135	57	104	[ANNULATION] Focaccia 	-1	8.00	-8.00	10.00	-0.73	f	0.00	\N	2025-07-09 12:54:30.825502	\N
136	58	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 12:55:09.660449	\N
137	58	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 12:55:09.673597	\N
138	58	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 12:55:09.677429	\N
139	58	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 12:55:09.681343	\N
140	58	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 12:55:09.686072	\N
141	59	103	[ANNULATION] Planche	-1	21.00	-21.00	10.00	-1.91	f	0.00	\N	2025-07-09 12:55:59.950685	\N
142	59	103	[ANNULATION] Planche	-1	21.00	-21.00	10.00	-1.91	f	0.00	\N	2025-07-09 12:55:59.954971	\N
143	59	103	[ANNULATION] Planche	-1	21.00	-21.00	10.00	-1.91	f	0.00	\N	2025-07-09 12:55:59.958289	\N
144	59	103	[ANNULATION] Planche	-1	21.00	-21.00	10.00	-1.91	f	0.00	\N	2025-07-09 12:55:59.960918	\N
145	59	103	[ANNULATION] Planche	-1	21.00	-21.00	10.00	-1.91	f	0.00	\N	2025-07-09 12:55:59.963382	\N
146	60	104	Focaccia 	1	8.00	8.00	10.00	0.73	f	0.00	\N	2025-07-09 13:07:42.791656	\N
147	61	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 13:15:51.227145	\N
148	61	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 13:15:51.235396	\N
149	61	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 13:15:51.243448	\N
150	61	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 13:15:51.251934	\N
151	61	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 13:15:51.259387	\N
152	61	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 13:15:51.267192	\N
153	62	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 13:17:26.5419	\N
154	62	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 13:17:26.550437	\N
155	62	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 13:17:26.55419	\N
156	62	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 13:17:26.557529	\N
157	62	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 13:17:26.560893	\N
158	63	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 13:20:53.399224	\N
159	63	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 13:20:53.405285	\N
160	63	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 13:20:53.409279	\N
161	64	94	Bellini	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-09 13:22:24.262084	\N
162	64	94	Bellini	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-09 13:22:24.267228	\N
163	64	94	Bellini	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-09 13:22:24.270742	\N
164	64	94	Bellini	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-09 13:22:24.274619	\N
165	64	94	Bellini	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-09 13:22:24.277885	\N
166	65	56	Bière du Moment	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-09 14:21:41.010485	\N
167	66	104	Focaccia 	1	8.00	8.00	10.00	0.73	f	0.00	\N	2025-07-09 14:51:48.823684	\N
168	67	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 14:53:27.521721	\N
169	68	105	Saucisson	1	6.50	6.50	10.00	0.59	f	0.00	\N	2025-07-09 14:54:08.287432	\N
170	69	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 15:03:27.118896	\N
172	71	37	Romarin	1	10.00	10.00	20.00	1.67	f	0.00	\N	2025-07-09 16:32:45.895119	\N
173	72	37	Romarin	1	5.00	5.00	20.00	0.83	f	0.00	\N	2025-07-09 16:44:58.864511	\N
174	73	37	Romarin	1	3.00	3.00	20.00	0.50	f	0.00	\N	2025-07-09 16:46:19.351614	\N
175	74	37	Romarin	1	4.00	4.00	20.00	0.67	f	0.00	\N	2025-07-09 16:47:05.756279	\N
176	75	37	Romarin	1	15.00	15.00	20.00	2.50	f	0.00	\N	2025-07-09 16:47:39.721282	\N
177	76	37	Romarin	1	8.00	8.00	20.00	1.33	f	0.00	\N	2025-07-09 16:47:45.068526	\N
178	77	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-09 16:56:58.878427	\N
179	81	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-11 18:34:39.179224	\N
180	81	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-11 18:34:39.184346	\N
181	83	41	Blanche	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-11 18:35:38.814446	\N
182	83	41	Blanche	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-11 18:35:38.820984	\N
183	83	41	Blanche	1	6.50	6.50	20.00	1.08	t	1.63	\N	2025-07-11 18:35:38.827881	\N
184	84	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-11 18:36:22.245346	\N
185	84	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-11 18:36:22.250287	\N
186	84	96	Menthe Pastille/Get	1	5.50	5.50	20.00	0.92	t	1.38	\N	2025-07-11 18:36:22.253516	\N
187	84	96	Menthe Pastille/Get	1	5.50	5.50	20.00	0.92	t	1.38	\N	2025-07-11 18:36:22.257605	\N
188	85	104	Focaccia 	1	8.00	8.00	10.00	0.73	f	0.00	\N	2025-07-11 18:36:33.092001	\N
189	85	104	Focaccia 	1	8.00	8.00	10.00	0.73	f	0.00	\N	2025-07-11 18:36:33.096308	\N
190	86	95	Americano	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-11 19:08:19.138722	\N
191	86	95	Americano	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-11 19:08:19.144194	\N
192	87	96	Menthe Pastille/Get	1	6.50	6.50	20.00	1.08	f	0.00	\N	2025-07-11 19:09:27.59575	\N
193	87	105	Saucisson	1	6.50	6.50	10.00	0.59	f	0.00	\N	2025-07-11 19:09:27.60251	\N
194	88	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-11 19:25:21.84306	\N
195	89	104	Focaccia 	1	8.00	8.00	10.00	0.73	f	0.00	\N	2025-07-11 19:27:14.919112	\N
196	90	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-12 11:00:58.971421	\N
197	90	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-12 11:00:58.977697	\N
198	90	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-12 11:00:58.98061	\N
199	91	105	Saucisson	1	6.50	6.50	10.00	0.59	f	0.00	\N	2025-07-12 11:01:11.417105	\N
200	91	105	Saucisson	1	6.50	6.50	10.00	0.59	f	0.00	\N	2025-07-12 11:01:11.422128	\N
201	91	105	Saucisson	1	6.50	6.50	10.00	0.59	f	0.00	\N	2025-07-12 11:01:11.425883	\N
202	92	56	Bière du Moment	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-12 11:01:22.548712	\N
203	92	56	Bière du Moment	1	7.50	7.50	20.00	1.25	f	0.00	\N	2025-07-12 11:01:22.555278	\N
204	93	101	Bière Sirop	1	7.00	7.00	20.00	1.17	f	0.00	\N	2025-07-12 11:01:31.620017	\N
205	93	101	Bière Sirop	1	7.00	7.00	20.00	1.17	f	0.00	\N	2025-07-12 11:01:31.636962	\N
206	95	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-12 13:13:49.441779	\N
207	95	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-12 13:13:49.454882	\N
208	95	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-12 13:13:49.460682	\N
209	95	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-12 13:13:49.466115	\N
210	95	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-12 13:13:49.471091	\N
211	96	103	Planche	1	21.00	21.00	10.00	1.91	f	0.00	\N	2025-07-12 13:19:59.102887	\N
212	97	105	Saucisson	1	6.50	6.50	10.00	0.59	f	0.00	\N	2025-07-12 13:20:27.090992	\N
218	100	\N	Divers	1	2.00	2.00	10.00	0.18	f	0.00	\N	2025-07-20 14:01:27.202261	\N
219	101	104	Focaccia 	1	8.00	8.00	10.00	0.73	f	0.00	\N	2025-07-20 14:01:56.652643	\N
220	101	\N	Divers	1	2.00	2.00	10.00	0.18	f	0.00	\N	2025-07-20 14:01:56.660679	\N
221	102	\N	[ANNULATION] Divers	-1	2.00	-2.00	10.00	-0.18	f	0.00	\N	2025-07-20 14:02:25.074312	\N
222	103	104	[ANNULATION] Focaccia 	-1	8.00	-8.00	10.00	-0.73	f	0.00	\N	2025-07-20 14:02:36.018087	\N
223	103	\N	[ANNULATION] Divers	-1	2.00	-2.00	10.00	-0.18	f	0.00	\N	2025-07-20 14:02:36.042689	\N
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, total_amount, total_tax, payment_method, status, notes, created_at, updated_at, tips, change) FROM stdin;
1	6.50	1.08	card	completed	Paiement par carte: 6.50€	2025-07-05 17:15:08.322	2025-07-05 17:15:08.322	0.00	0.00
2	13.50	2.25	card	completed	Paiement par carte: 13.50€	2025-07-05 17:15:21.771	2025-07-05 17:15:21.771	0.00	0.00
3	9.00	0.82	card	completed	Paiement par carte: 9.00€	2025-07-05 17:22:25.828	2025-07-05 17:22:25.828	0.00	0.00
4	11.00	1.49	card	completed	Paiement par carte: 11.00€	2025-07-05 17:23:05.998	2025-07-05 17:23:05.998	0.00	0.00
5	6.50	0.86	card	completed	Paiement par carte: 6.50€	2025-07-05 17:41:47.175	2025-07-05 17:41:47.175	0.00	0.00
6	11.00	1.34	card	completed	Paiement par carte: 11.00€	2025-07-05 17:53:54.639	2025-07-05 17:53:54.639	0.00	0.00
7	11.50	1.92	card	completed	Paiement par carte: 11.50€	2025-07-05 17:55:33.866	2025-07-05 17:55:33.866	0.00	0.00
8	9.00	0.82	cash	completed	Paiement: 9.00€, Rendu: 0.00€	2025-07-05 18:30:42.494	2025-07-05 18:30:42.494	0.00	0.00
9	3.50	0.58	card	completed	Paiement par carte: 3.50€	2025-07-05 18:36:03.598	2025-07-05 18:36:03.598	0.00	0.00
10	37.00	4.80	card	completed	Paiement par carte: 37.00€	2025-07-05 18:45:06.373	2025-07-05 18:45:06.373	0.00	0.00
11	18.00	3.00	split	completed	Split par items - 3 parts: Part 1: Espèces 6.50€, Part 2: Carte 5.00€, Part 3: Carte 6.50€	2025-07-05 18:49:00.037	2025-07-05 18:49:00.037	0.00	0.00
12	6.50	1.08	card	completed	Paiement par carte: 6.50€	2025-07-05 18:57:28.076	2025-07-05 18:57:28.076	0.00	0.00
13	20.00	2.84	card	completed	Paiement par carte: 20.00€	2025-07-05 18:59:51.509	2025-07-05 18:59:51.509	0.00	0.00
14	13.00	2.17	card	completed	Paiement par carte: 13.00€	2025-07-05 19:00:13.921	2025-07-05 19:00:13.921	0.00	0.00
15	42.50	5.49	card	completed	Paiement par carte: 42.50€	2025-07-05 19:08:33.336	2025-07-05 19:08:33.336	0.00	0.00
16	25.00	3.75	card	completed	Paiement par carte: 25.00€	2025-07-05 19:20:46.06	2025-07-05 19:20:46.06	0.00	0.00
17	8.00	0.73	card	completed	Paiement par carte: 8.00€	2025-07-05 19:21:05.216	2025-07-05 19:21:05.216	0.00	0.00
18	22.00	3.67	split	completed	Split par items - 3 parts: Part 1: Carte 7.50€, Part 2: Carte 7.00€, Part 3: Carte 7.50€	2025-07-05 19:23:12.038	2025-07-05 19:23:12.038	0.00	0.00
19	15.00	2.50	card	completed	Paiement par carte: 15.00€	2025-07-05 19:37:57.254	2025-07-05 19:37:57.254	0.00	0.00
20	16.00	2.67	card	completed	Paiement par carte: 16.00€	2025-07-05 19:41:26.159	2025-07-05 19:41:26.159	0.00	0.00
21	15.00	2.50	card	completed	Paiement par carte: 15.00€	2025-07-05 19:48:01.063	2025-07-05 19:48:01.063	0.00	0.00
22	15.00	2.50	card	completed	Paiement par carte: 15.00€	2025-07-05 19:51:10.462	2025-07-05 19:51:10.462	0.00	0.00
23	22.00	3.06	card	completed	Paiement par carte: 22.00€	2025-07-05 19:58:32.631	2025-07-05 19:58:32.631	0.00	0.00
24	4.50	0.75	card	completed	Paiement par carte: 4.50€	2025-07-05 20:01:48.563	2025-07-05 20:01:48.563	0.00	0.00
25	15.00	2.50	split	completed	Split par items - 2 parts: Part 1: Carte 7.50€, Part 2: Espèces 7.50€	2025-07-05 20:07:17.52	2025-07-05 20:07:17.52	0.00	0.00
26	4.50	0.75	card	completed	Paiement par carte: 4.50€	2025-07-05 20:07:55.439	2025-07-05 20:07:55.439	0.00	0.00
27	7.50	1.25	card	completed	Paiement par carte: 7.50€	2025-07-05 20:09:52.564	2025-07-05 20:09:52.564	0.00	0.00
28	13.00	2.17	card	completed	Paiement par carte: 13.00€	2025-07-05 20:24:33.944	2025-07-05 20:24:33.944	0.00	0.00
29	14.50	2.42	card	completed	Paiement par carte: 14.50€	2025-07-05 20:28:08.243	2025-07-05 20:28:08.243	0.00	0.00
30	14.00	2.33	card	completed	Paiement par carte: 14.00€	2025-07-05 20:28:40.591	2025-07-05 20:28:40.591	0.00	0.00
31	15.00	2.50	cash	completed	Paiement: 15.00€, Rendu: 0.00€	2025-07-05 20:31:15.363	2025-07-05 20:31:15.363	0.00	0.00
32	9.00	1.50	card	completed	Paiement par carte: 9.00€	2025-07-05 20:31:26.249	2025-07-05 20:31:26.249	0.00	0.00
33	7.50	1.25	card	completed	Paiement par carte: 7.50€	2025-07-05 20:34:06.521	2025-07-05 20:34:06.521	0.00	0.00
34	6.50	1.08	card	completed	Paiement par carte: 6.50€	2025-07-05 20:35:14.02	2025-07-05 20:35:14.02	0.00	0.00
35	54.50	7.49	card	completed	Paiement par carte: 54.50€	2025-07-05 20:36:59.721	2025-07-05 20:36:59.721	0.00	0.00
36	14.50	2.42	card	completed	Paiement par carte: 14.50€	2025-07-05 20:51:24.159	2025-07-05 20:51:24.159	0.00	0.00
37	7.50	1.25	card	completed	Paiement par carte: 7.50€	2025-07-05 21:07:16.542	2025-07-05 21:07:16.542	0.00	0.00
38	61.00	7.25	card	completed	Paiement par carte: 61.00€	2025-07-05 21:10:21.257	2025-07-05 21:10:21.257	0.00	0.00
39	35.00	5.23	card	completed	Paiement par carte: 35.00€	2025-07-05 21:28:30.925	2025-07-05 21:28:30.925	0.00	0.00
40	12.00	2.00	card	completed	Paiement par carte: 12.00€	2025-07-05 21:30:46.457	2025-07-05 21:30:46.457	0.00	0.00
41	4.50	0.75	card	completed	Paiement par carte: 4.50€	2025-07-05 21:32:05.635	2025-07-05 21:32:05.635	0.00	0.00
42	33.50	4.37	split	completed	Split par items - 2 parts: Part 1: Carte 13.00€, Part 2: Carte 20.50€	2025-07-05 21:35:43.124	2025-07-05 21:35:43.124	0.00	0.00
43	8.00	1.33	card	completed	Paiement par carte: 8.00€	2025-07-05 21:42:55.348	2025-07-05 21:42:55.348	0.00	0.00
44	7.50	1.25	card	completed	Paiement par carte: 7.50€	2025-07-05 22:09:49.164	2025-07-05 22:09:49.164	0.00	0.00
45	12.00	2.00	card	completed	Paiement par carte: 12.00€	2025-07-05 22:11:16.972	2025-07-05 22:11:16.972	0.00	0.00
46	12.00	2.00	card	completed	Paiement par carte: 12.00€	2025-07-05 22:11:53.941	2025-07-05 22:11:53.941	0.00	0.00
47	24.00	4.00	card	completed	Paiement par carte: 24.00€	2025-07-05 22:12:44.141	2025-07-05 22:12:44.141	0.00	0.00
48	8.00	1.33	card	completed	Paiement par carte: 8.00€	2025-07-05 22:17:23.259	2025-07-05 22:17:23.259	0.00	0.00
49	46.50	5.74	split	completed	Split égal - 2 parts: Part 1: Carte 23.25€, Part 2: Carte 23.25€	2025-07-05 22:28:11.069	2025-07-05 22:28:11.069	0.00	0.00
50	21.00	2.25	card	completed	Paiement par carte: 21.00€	2025-07-05 22:28:46.373	2025-07-05 22:28:46.373	0.00	0.00
51	21.00	1.91	card	completed	Paiement par carte: 21.00€	2025-07-05 22:29:43.28	2025-07-05 22:29:43.28	0.00	0.00
52	15.50	2.58	card	completed	Paiement par carte: 15.50€	2025-07-05 22:39:00.107	2025-07-05 22:39:00.107	0.00	0.00
53	7.50	1.25	card	completed	Paiement par carte: 7.50€	2025-07-05 22:59:52.189	2025-07-05 22:59:52.189	0.00	0.00
54	7.50	1.25	card	completed	Paiement par carte: 7.50€	2025-07-05 23:29:51.12	2025-07-05 23:29:51.12	0.00	0.00
55	-8.00	-1.33	card	completed	ANNULATION de la commande #43 - Raison: Test Fail safe	2025-07-09 12:29:27.466616	2025-07-09 12:29:27.466616	0.00	0.00
56	-7.50	-1.25	card	completed	ANNULATION de la commande #44 - Raison: Test Fail Safze	2025-07-09 12:35:48.549407	2025-07-09 12:35:48.549407	0.00	0.00
57	-35.00	-5.23	card	completed	ANNULATION de la commande #39 - Raison: Test Fail Safe	2025-07-09 12:54:30.781842	2025-07-09 12:54:30.781842	0.00	0.00
58	105.00	9.55	card	completed	Paiement par carte: 105.00€	2025-07-09 12:55:09.655429	2025-07-09 12:55:09.655429	0.00	0.00
59	-105.00	-9.55	card	completed	ANNULATION de la commande #58 - Raison: Test Fail Safe	2025-07-09 12:55:59.947501	2025-07-09 12:55:59.947501	0.00	0.00
60	8.00	0.73	card	completed	Paiement par carte: 8.00€	2025-07-09 13:07:42.780251	2025-07-09 13:07:42.780251	0.00	0.00
61	126.00	11.45	card	completed	Paiement par carte: 126.00€	2025-07-09 13:15:51.219429	2025-07-09 13:15:51.219429	0.00	0.00
62	105.00	9.55	card	completed	Paiement par carte: 105.00€	2025-07-09 13:17:26.537257	2025-07-09 13:17:26.537257	0.00	0.00
63	63.00	5.73	card	completed	Paiement par carte: 63.00€	2025-07-09 13:20:53.386403	2025-07-09 13:20:53.386403	0.00	0.00
64	32.50	5.42	card	completed	Paiement par carte: 32.50€	2025-07-09 13:22:24.257304	2025-07-09 13:22:24.257304	0.00	0.00
65	7.50	1.25	card	completed	Paiement par carte: 7.50€	2025-07-09 14:21:41.000821	2025-07-09 14:21:41.000821	0.00	0.00
66	8.00	0.73	card	completed	Paiement par carte: 8.00€	2025-07-09 14:51:48.817286	2025-07-09 14:51:48.817286	0.00	0.00
67	21.00	1.91	card	completed	Paiement par carte: 21.00€	2025-07-09 14:53:27.517283	2025-07-09 14:53:27.517283	0.00	0.00
68	6.50	0.59	card	completed	Paiement par carte: 6.50€	2025-07-09 14:54:08.282258	2025-07-09 14:54:08.282258	0.00	0.00
69	21.00	1.91	card	completed	Paiement par carte: 21.00€	2025-07-09 15:03:27.113846	2025-07-09 15:03:27.113846	0.00	0.00
70	10.00	1.67	card	completed	Test order with tip	2025-07-09 16:32:34.581827	2025-07-09 16:32:34.581827	0.00	0.00
71	10.00	1.67	card	completed	Test order with tip	2025-07-09 16:32:45.891293	2025-07-09 16:32:45.891293	0.00	0.00
72	5.00	0.83	card	completed	Simple test	2025-07-09 16:44:58.860338	2025-07-09 16:44:58.860338	0.00	0.00
73	3.00	0.50	card	completed	Debug test	2025-07-09 16:46:19.347085	2025-07-09 16:46:19.347085	0.00	0.00
74	4.00	0.67	card	completed	Debug test 2	2025-07-09 16:47:05.74211	2025-07-09 16:47:05.74211	3.00	2.00
75	15.00	2.50	card	completed	Order with tip	2025-07-09 16:47:39.714018	2025-07-09 16:47:39.714018	2.50	0.00
76	8.00	1.33	cash	completed	Cash order with change	2025-07-09 16:47:45.057611	2025-07-09 16:47:45.057611	1.00	2.00
77	21.00	1.91	card	completed	Paiement par carte: 21.00€	2025-07-09 16:56:58.867131	2025-07-09 16:56:58.867131	2.00	0.00
78	0.00	0.00	cash	completed	Changement de caisse: Carte → Espèces 50.00€	2025-07-09 17:22:41.659736	2025-07-09 17:22:41.659736	0.00	50.00
79	0.00	0.00	card	completed	Changement de caisse: Espèces → Carte 25.00€	2025-07-09 17:22:45.972535	2025-07-09 17:22:45.972535	0.00	25.00
80	0.00	0.00	cash	completed	Faire de la Monnaie: Carte → Espèces 10.00€	2025-07-09 18:20:04.198333	2025-07-09 18:20:04.198333	0.00	10.00
81	42.00	3.82	split	completed	Split par items - 2 parts: Part 1: Espèces 21.00€, Part 2: Carte 21.00€	2025-07-11 18:34:39.173205	2025-07-11 18:34:39.173205	0.00	0.00
82	0.00	0.00	cash	completed	Faire de la Monnaie: Carte → Espèces 10.00€	2025-07-11 18:34:55.604932	2025-07-11 18:34:55.604932	0.00	10.00
83	19.50	3.25	split	completed	Split égal - 2 parts: Part 1: Carte 9.75€, Part 2: Split 5.50€ espèces + 4.25€ carte	2025-07-11 18:35:38.79716	2025-07-11 18:35:38.79716	0.00	0.00
84	53.00	5.65	card	completed	Paiement par carte: 53.00€	2025-07-11 18:36:22.233843	2025-07-11 18:36:22.233843	10.00	0.00
85	16.00	1.45	cash	completed	Paiement: 16.00€, Rendu: 0.00€	2025-07-11 18:36:33.087213	2025-07-11 18:36:33.087213	0.00	0.00
86	13.00	2.17	split	completed	Split égal - 2 parts: Part 1: Carte 6.50€, Part 2: Espèces 6.50€	2025-07-11 19:08:19.132054	2025-07-11 19:08:19.132054	0.00	0.00
87	13.00	1.67	split	completed	Split par items - 2 parts: Part 1: Espèces 6.50€, Part 2: Carte 6.50€	2025-07-11 19:09:27.583471	2025-07-11 19:09:27.583471	0.00	0.00
88	21.00	1.91	cash	completed	Paiement: 21.00€, Rendu: 0.00€	2025-07-11 19:25:21.832548	2025-07-11 19:25:21.832548	0.00	0.00
89	8.00	0.73	cash	completed	Paiement: 8.00€, Rendu: 0.00€	2025-07-11 19:27:14.913508	2025-07-11 19:27:14.913508	0.00	0.00
90	63.00	5.73	split	completed	Split par items - 2 parts: Part 1: Espèces 42.00€, Part 2: Split 11.00€ espèces + 10.00€ carte	2025-07-12 11:00:58.958831	2025-07-12 11:00:58.958831	10.00	0.00
91	19.50	1.77	split	completed	Split égal - 2 parts: Part 1: Carte 9.75€, Part 2: Espèces 9.75€	2025-07-12 11:01:11.405242	2025-07-12 11:01:11.405242	0.00	0.00
92	15.00	2.50	card	completed	Paiement par carte: 15.00€	2025-07-12 11:01:22.536401	2025-07-12 11:01:22.536401	0.00	0.00
93	14.00	2.33	cash	completed	Paiement: 14.00€, Rendu: 0.00€	2025-07-12 11:01:31.608502	2025-07-12 11:01:31.608502	0.00	0.00
94	0.00	0.00	cash	completed	Faire de la Monnaie: Carte → Espèces 10.00€	2025-07-12 11:01:40.202884	2025-07-12 11:01:40.202884	0.00	10.00
95	105.00	9.55	card	completed	Paiement par carte: 105.00€	2025-07-12 13:13:49.434467	2025-07-12 13:13:49.434467	0.00	0.00
96	21.00	1.91	card	completed	Paiement par carte: 21.00€	2025-07-12 13:19:59.094913	2025-07-12 13:19:59.094913	10.00	0.00
97	6.50	0.59	card	completed	Paiement par carte: 6.50€	2025-07-12 13:20:27.085526	2025-07-12 13:20:27.085526	20.00	0.00
98	0.00	0.00	cash	completed	Faire de la Monnaie: Carte → Espèces 100.00€	2025-07-12 13:20:52.065291	2025-07-12 13:20:52.065291	0.00	100.00
100	2.00	0.18	card	completed	Paiement par carte: 2.00€	2025-07-20 14:01:27.164479	2025-07-20 14:01:27.164479	0.00	0.00
101	10.00	0.91	card	completed	Paiement par carte: 10.00€	2025-07-20 14:01:56.647752	2025-07-20 14:01:56.647752	0.00	0.00
102	-2.00	-0.18	card	completed	ANNULATION complète - Commande #100 - Raison: fdghdfgdfnb	2025-07-20 14:02:25.063549	2025-07-20 14:02:25.063549	0.00	0.00
103	-10.00	-0.91	card	completed	ANNULATION complète - Commande #101 - Raison: bn cbvxc	2025-07-20 14:02:36.007223	2025-07-20 14:02:36.007223	0.00	0.00
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
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, price, tax_rate, category_id, happy_hour_discount_percent, happy_hour_discount_fixed, is_happy_hour_eligible, created_at, updated_at, is_active) FROM stdin;
66	Caïpi	7.00	20.00	28	0.00	\N	t	2025-07-05 17:44:54.991	2025-07-05 17:44:54.991	t
67	Caïpi liqueur	8.00	20.00	28	0.00	\N	t	2025-07-05 17:45:13.338	2025-07-05 17:45:13.338	t
68	Espresso Martini	8.00	20.00	28	0.00	\N	t	2025-07-05 17:45:37.893	2025-07-05 17:45:37.893	t
69	Gin To	8.00	20.00	28	0.00	\N	t	2025-07-05 17:45:53.481	2025-07-05 17:45:53.481	t
70	Gin To liqueur	9.00	20.00	28	0.00	\N	t	2025-07-05 17:46:10.993	2025-07-05 17:46:10.993	t
71	Bramble Star	8.00	20.00	28	0.00	\N	t	2025-07-05 17:48:10.02	2025-07-05 17:48:10.02	t
72	Moscow Mule	8.00	20.00	28	0.00	\N	t	2025-07-05 17:48:43.524	2025-07-05 17:48:43.524	t
73	Jus de Pomme Pétillant	5.50	10.00	30	0.00	\N	t	2025-07-05 17:50:21.545	2025-07-05 17:50:21.545	t
40	Triple	7.50	20.00	26	0.00	\N	t	2025-07-05 16:40:04.295	2025-07-05 16:40:04.295	t
39	IPA	7.50	20.00	26	0.00	\N	t	2025-07-04 14:04:06.677	2025-07-05 16:40:20.936	t
37	Romarin	7.50	20.00	26	0.00	\N	t	2025-07-04 13:37:32.793	2025-07-05 16:40:51.402	t
42	Spritz Sureau	8.00	20.00	28	0.00	\N	t	2025-07-05 16:41:51.285	2025-07-05 16:41:51.285	t
43	Dry Quiri	5.50	10.00	29	0.00	\N	t	2025-07-05 17:20:07.101	2025-07-05 17:20:07.101	t
44	Bissap	5.50	10.00	30	0.00	\N	t	2025-07-05 17:21:01.052	2025-07-05 17:21:01.052	t
45	Ginger	5.50	10.00	30	0.00	\N	t	2025-07-05 17:21:50.767	2025-07-05 17:21:50.767	t
46	Blonde de Soif	6.00	20.00	26	0.00	\N	t	2025-07-05 17:33:48.511	2025-07-05 17:34:23.593	t
47	Blonde de Soif	3.50	20.00	26	0.00	\N	f	2025-07-05 17:34:10.745	2025-07-05 17:34:31.21	t
48	Blanche	4.50	20.00	26	0.00	\N	f	2025-07-05 17:34:49.113	2025-07-05 17:34:49.113	t
49	IPA	4.50	20.00	26	0.00	\N	f	2025-07-05 17:35:09.703	2025-07-05 17:35:09.703	t
50	Romarin	4.50	20.00	26	0.00	\N	f	2025-07-05 17:35:28.675	2025-07-05 17:35:28.675	t
51	Triple	4.50	20.00	26	0.00	\N	f	2025-07-05 17:35:55.937	2025-07-05 17:35:55.937	t
52	NEIPA	7.50	20.00	26	0.00	\N	t	2025-07-05 17:36:26.851	2025-07-05 17:36:26.851	t
53	NEIPA	4.50	20.00	26	0.00	\N	f	2025-07-05 17:36:43.558	2025-07-05 17:36:43.558	t
54	Rouge	7.50	20.00	26	0.00	\N	t	2025-07-05 17:37:16.933	2025-07-05 17:37:16.933	t
55	Rouge	4.50	20.00	26	0.00	\N	f	2025-07-05 17:37:32.048	2025-07-05 17:37:32.048	t
56	Bière du Moment	7.50	20.00	26	0.00	\N	t	2025-07-05 17:38:29.362	2025-07-05 17:38:29.362	t
57	Bière du Moment	4.50	20.00	26	0.00	\N	f	2025-07-05 17:39:15.217	2025-07-05 17:39:15.217	t
59	Picon	4.50	20.00	26	0.00	\N	f	2025-07-05 17:40:32.912	2025-07-05 17:40:32.912	t
58	Picon	7.00	20.00	26	0.00	\N	t	2025-07-05 17:40:09.677	2025-07-05 17:40:46.62	t
60	Coca	4.00	10.00	30	0.00	\N	t	2025-07-05 17:41:27.785	2025-07-05 17:41:27.785	t
61	Spritz Apérol	7.00	20.00	28	0.00	\N	t	2025-07-05 17:42:11.489	2025-07-05 17:42:11.489	t
62	Spritz Campari	8.00	20.00	28	0.00	\N	t	2025-07-05 17:42:29.498	2025-07-05 17:42:29.498	t
63	Spritz Limoncello	8.00	20.00	28	0.00	\N	t	2025-07-05 17:43:15.197	2025-07-05 17:43:15.197	t
64	Amaretto Stormy	8.00	20.00	28	0.00	\N	t	2025-07-05 17:43:55.598	2025-07-05 17:43:55.598	t
65	Cocktail du moment	8.00	20.00	28	0.00	\N	t	2025-07-05 17:44:14.222	2025-07-05 17:44:14.222	t
74	London Mule	8.00	20.00	28	0.00	\N	t	2025-07-05 17:50:53.922	2025-07-05 17:50:53.922	t
75	Jamaïcan Mule	8.00	20.00	28	0.00	\N	t	2025-07-05 17:52:19.129	2025-07-05 17:52:19.129	t
76	Citronnade	5.50	10.00	29	0.00	\N	t	2025-07-05 17:52:45.901	2025-07-05 17:52:45.901	t
77	Sirop	2.00	10.00	30	0.00	\N	f	2025-07-05 17:53:17.422	2025-07-05 17:53:17.422	t
78	Whiskey Coca	8.00	20.00	28	0.00	\N	t	2025-07-05 17:56:27.44	2025-07-05 17:56:27.44	t
79	Whiskey Coca double	10.00	20.00	28	0.00	\N	f	2025-07-05 17:56:54.589	2025-07-05 17:56:54.589	t
80	Cuba Libre	8.00	20.00	28	0.00	\N	t	2025-07-05 17:57:12.037	2025-07-05 17:57:12.037	t
81	CDR	6.50	20.00	31	0.00	\N	t	2025-07-05 17:58:00.453	2025-07-05 17:58:00.453	t
82	CDR	25.00	20.00	31	0.00	\N	f	2025-07-05 17:58:19.959	2025-07-05 17:58:19.959	t
83	Blaye	6.50	20.00	31	0.00	\N	t	2025-07-05 17:58:56.95	2025-07-05 17:58:56.95	t
84	Blaye	25.00	20.00	31	0.00	\N	f	2025-07-05 17:59:17.273	2025-07-05 17:59:17.273	t
85	Chardo	5.50	20.00	31	0.00	\N	t	2025-07-05 17:59:35.06	2025-07-05 17:59:35.06	t
86	Chardo	23.00	20.00	31	0.00	\N	f	2025-07-05 18:00:03.594	2025-07-05 18:00:03.594	t
87	Uby 3	6.50	20.00	31	0.00	\N	t	2025-07-05 18:00:28.606	2025-07-05 18:00:28.606	t
88	Uby 3	25.00	20.00	31	0.00	\N	f	2025-07-05 18:00:48.102	2025-07-05 18:00:48.102	t
89	Uby 4	6.50	20.00	31	0.00	\N	t	2025-07-05 18:01:12.863	2025-07-05 18:01:12.863	t
90	Uby 4	25.00	20.00	31	0.00	\N	f	2025-07-05 18:01:40.446	2025-07-05 18:01:40.446	t
91	Negroni	8.00	20.00	28	0.00	\N	t	2025-07-05 18:02:44.568	2025-07-05 18:02:44.568	t
92	Proscecco	5.50	20.00	31	0.00	\N	t	2025-07-05 18:03:21.589	2025-07-05 18:03:21.589	t
93	Pastis	4.00	20.00	32	0.00	\N	t	2025-07-05 18:03:36.682	2025-07-05 18:03:36.682	t
94	Bellini	6.50	20.00	32	0.00	\N	t	2025-07-05 18:04:24.678	2025-07-05 18:04:24.678	t
96	Menthe Pastille/Get	6.50	20.00	32	0.00	\N	t	2025-07-05 18:04:55.825	2025-07-05 18:04:55.825	t
97	Baileys	6.50	20.00	32	0.00	\N	t	2025-07-05 18:05:11.832	2025-07-05 18:05:11.832	t
95	Americano	6.50	20.00	32	0.00	\N	t	2025-07-05 18:04:37.528	2025-07-05 18:05:39.505	t
98	Café	2.00	10.00	30	0.00	\N	f	2025-07-05 18:05:59.787	2025-07-05 18:05:59.787	t
99	Jus de Fruit	4.00	10.00	30	0.00	\N	t	2025-07-05 18:06:24.504	2025-07-05 18:06:24.504	t
100	IPA Sans Alcool	5.50	10.00	30	0.00	\N	t	2025-07-05 18:08:25.585	2025-07-05 18:08:25.585	t
101	Bière Sirop	7.00	20.00	26	0.00	\N	t	2025-07-05 18:09:36.718	2025-07-05 18:09:55.523	t
102	Bière Sirop	4.50	20.00	26	0.00	\N	f	2025-07-05 18:10:39.529	2025-07-05 18:10:39.529	t
107	Ti Punch	7.00	20.00	28	0.00	\N	t	2025-07-05 20:50:48.544	2025-07-05 20:50:48.544	t
41	Blanche	7.50	20.00	26	0.00	\N	t	2025-07-05 16:41:21.685	2025-07-08 18:06:31.933736	t
104	Focaccia 	8.00	10.00	33	0.00	\N	f	2025-07-05 18:11:47.653	2025-07-08 18:07:25.251348	t
105	Saucisson	6.50	10.00	33	0.00	\N	f	2025-07-05 18:12:06.341	2025-07-08 18:07:53.184857	t
103	Planche	21.00	10.00	33	0.00	\N	f	2025-07-05 18:11:28.594	2025-07-08 18:08:00.83152	t
106	Blanche	7.50	20.00	26	0.00	\N	t	2025-07-05 20:37:33.952	2025-07-16 11:48:07.628069	t
\.


--
-- Data for Name: sub_bills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sub_bills (id, order_id, payment_method, amount, status, created_at) FROM stdin;
1	81	cash	21.00	paid	2025-07-11 18:34:39.187523
2	81	card	21.00	paid	2025-07-11 18:34:39.191435
3	83	card	9.75	paid	2025-07-11 18:35:38.831901
4	83	cash	5.50	paid	2025-07-11 18:35:38.836499
5	83	card	4.25	paid	2025-07-11 18:35:38.840101
6	86	card	6.50	paid	2025-07-11 19:08:19.148304
7	86	cash	6.50	paid	2025-07-11 19:08:19.153417
8	87	cash	6.50	paid	2025-07-11 19:09:27.606389
9	87	card	6.50	paid	2025-07-11 19:09:27.61012
10	90	cash	42.00	paid	2025-07-12 11:00:58.983585
11	90	cash	11.00	paid	2025-07-12 11:00:58.987059
12	90	card	10.00	paid	2025-07-12 11:00:58.989692
13	91	card	9.75	paid	2025-07-12 11:01:11.429915
14	91	cash	9.75	paid	2025-07-12 11:01:11.4347
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
1	elliot.vergne@gmail.com	$2b$12$5mAJ5bPkIWDS5yOplk8tIeoSve1P8SpU9hYozdDB5C/Hnn1JUM4VK	t	2025-07-03 16:46:25.85
\.


--
-- Name: archive_exports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.archive_exports_id_seq', 1, false);


--
-- Name: audit_trail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_trail_id_seq', 253, true);


--
-- Name: business_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.business_settings_id_seq', 1, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 39, true);


--
-- Name: closure_bulletins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.closure_bulletins_id_seq', 35, true);


--
-- Name: closure_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.closure_settings_id_seq', 10, true);


--
-- Name: legal_journal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.legal_journal_id_seq', 46, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 223, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 103, true);


--
-- Name: permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permissions_id_seq', 6, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 114, true);


--
-- Name: sub_bills_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sub_bills_id_seq', 14, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


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
-- Name: idx_audit_action_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_action_time ON public.audit_trail USING btree (action_type, "timestamp");


--
-- Name: idx_audit_resource; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_resource ON public.audit_trail USING btree (resource_type, resource_id);


--
-- Name: idx_audit_user_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_user_time ON public.audit_trail USING btree (user_id, "timestamp");


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
-- Name: legal_journal legal_journal_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.legal_journal
    ADD CONSTRAINT legal_journal_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


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
-- Name: SEQUENCE order_items_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.order_items_id_seq TO musebar_user;


--
-- Name: SEQUENCE orders_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.orders_id_seq TO musebar_user;


--
-- Name: SEQUENCE permissions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.permissions_id_seq TO musebar_user;


--
-- Name: SEQUENCE products_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.products_id_seq TO musebar_user;


--
-- Name: SEQUENCE sub_bills_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.sub_bills_id_seq TO musebar_user;


--
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_id_seq TO musebar_user;


--
-- PostgreSQL database dump complete
--

