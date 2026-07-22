
-- Testimonials with realistic dummy data
UPDATE home_sections SET config = jsonb_build_object(
  'limit', 6,
  'items', jsonb_build_array(
    jsonb_build_object('name','Ayesha Khan','role','Karachi','rating',5,'quote','My Chanel No. 5 arrived beautifully wrapped and 100% authentic. The unboxing experience felt truly luxurious.','avatar','https://i.pravatar.cc/120?img=47'),
    jsonb_build_object('name','Hina Malik','role','Lahore','rating',5,'quote','I ordered a Louis Vuitton crossbody and it exceeded expectations. Fast delivery and premium packaging.','avatar','https://i.pravatar.cc/120?img=45'),
    jsonb_build_object('name','Sara Ahmed','role','Islamabad','rating',5,'quote','Finally a trusted place for original designer perfumes in Pakistan. Customer support was exceptional.','avatar','https://i.pravatar.cc/120?img=32'),
    jsonb_build_object('name','Zainab Fatima','role','Rawalpindi','rating',5,'quote','My Dior Sauvage gift set was perfect for my husband. The presentation alone was worth it.','avatar','https://i.pravatar.cc/120?img=44'),
    jsonb_build_object('name','Mehak Iqbal','role','Faisalabad','rating',5,'quote','The Prada tote is stunning and clearly authentic. Will absolutely be a repeat customer.','avatar','https://i.pravatar.cc/120?img=48'),
    jsonb_build_object('name','Noor Riaz','role','Multan','rating',5,'quote','From order to delivery, everything was seamless. This is how luxury shopping should feel.','avatar','https://i.pravatar.cc/120?img=49')
  )
)
WHERE section_type='testimonials';

-- Add perfume video to first hero slide
UPDATE hero_slides
SET video_url = 'https://videos.pexels.com/video-files/6621462/6621462-hd_1920_1080_30fps.mp4',
    overlay_opacity = 0.55
WHERE title = 'The Art of Fragrance';

-- Richer About page content
UPDATE pages SET content = $HTML$
<section>
<h2>Our Story</h2>
<p>Founded with a singular obsession for authenticity, <strong>AURELIA</strong> is Pakistan's destination for genuine designer perfumes and luxury handbags. Every bottle, every clutch, every crossbody — sourced directly from authorized channels, hand-verified, and delivered in packaging worthy of the maisons we carry.</p>
</section>

<section>
<h2>What We Stand For</h2>
<ul>
<li><strong>100% Authentic</strong> — Every product is guaranteed original with certificates of authenticity.</li>
<li><strong>Curated Selection</strong> — We only stock icons: Chanel, Dior, Gucci, Louis Vuitton, Hermès, Tom Ford, YSL, Prada and more.</li>
<li><strong>Concierge Service</strong> — Personal styling, gift wrapping and white-glove delivery across Pakistan.</li>
<li><strong>Secure Payments</strong> — Fully protected checkout with cash on delivery available nationwide.</li>
<li><strong>30-Day Returns</strong> — Change of heart? Return unopened items within 30 days, no questions asked.</li>
</ul>
</section>

<section>
<h2>The AURELIA Promise</h2>
<p>We believe luxury is not just about the object — it is about the ritual, the reveal, the feeling of holding something crafted with intention. That is why we obsess over every detail: sealed authenticity tags, silk-touch packaging, hand-written notes, and next-day dispatch from our Karachi and Lahore ateliers.</p>
</section>

<section>
<h2>Perfumes — Bottled Art</h2>
<p>Our fragrance library spans the great houses of Paris, Milan and New York. From the crisp bergamot of a Dior Sauvage to the smoky oud of Tom Ford's Private Blend, each bottle in our collection has been chosen for its craftsmanship and legacy. We carry Eau de Parfum, Eau de Toilette and exclusive gift sets — all direct-imported, never grey market.</p>
</section>

<section>
<h2>Handbags — Heirlooms in the Making</h2>
<p>A handbag is more than an accessory — it is a signature. Our collection features investment pieces from Louis Vuitton, Prada, Gucci, Coach, Michael Kors and Hermès, ranging from everyday totes to statement clutches. Each bag is inspected, authenticated and photographed by our in-house team before it reaches you.</p>
</section>

<section>
<h2>Why Shop With Us</h2>
<ul>
<li>Nationwide free delivery on orders over PKR 15,000</li>
<li>Cash on delivery in 200+ cities</li>
<li>Dedicated WhatsApp support 7 days a week</li>
<li>Loyalty rewards and early access to new arrivals</li>
<li>Gift wrapping and personalized notes on request</li>
</ul>
</section>

<section>
<h2>Visit Us</h2>
<p>Our concierge team is available on WhatsApp and email 7 days a week. Whether you need help choosing your next signature scent or matching a bag to your capsule wardrobe, we are here to guide you. <em>Welcome to the house.</em></p>
</section>
$HTML$
WHERE slug='about';
