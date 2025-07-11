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
    tips_total numeric(12,2) DEFAULT 0 NOT NULL,
    change_total numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT closure_bulletins_closure_type_check CHECK (((closure_type)::text = ANY ((ARRAY['DAILY'::character varying, 'MONTHLY'::character varying, 'ANNUAL'::character varying])::text[]))),
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
-- Name: legal_journal trigger_prevent_legal_journal_modification; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_prevent_legal_journal_modification BEFORE DELETE OR UPDATE ON public.legal_journal FOR EACH ROW EXECUTE FUNCTION public.prevent_legal_journal_modification();


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

