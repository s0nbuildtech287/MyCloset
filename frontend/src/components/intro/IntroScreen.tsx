import { ArrowRight, LockKeyhole, Sparkles, Shirt, WandSparkles } from 'lucide-react';
import logo from '../../assets/drobe1_cropped.png';

interface Props { onExplore: () => void; onLogin: () => void }

export default function IntroScreen({ onExplore, onLogin }: Props) {
  return (
    <main className="intro-shell">
      <div className="intro-orbit intro-orbit-one" />
      <div className="intro-orbit intro-orbit-two" />
      <nav className="intro-nav">
        <div className="intro-brand"><img src={logo} alt="Drobe" /><span>Drobe <small>MY CLOSET</small></span></div>
        <button className="intro-login-link" onClick={onLogin}><LockKeyhole size={15} /> Đăng nhập</button>
      </nav>

      <section className="intro-grid">
        <div className="intro-copy">
          <div className="intro-kicker"><Sparkles size={15} /> PERSONAL STYLE, SIMPLIFIED</div>
          <h1>Tủ đồ của bạn.<br /><em>Phong cách</em> của bạn.</h1>
          <p>Lưu lại những món đồ bạn yêu thích, thử phối outfit và chuẩn bị hành lý trong một không gian nhẹ nhàng, trực quan.</p>
          <div className="intro-actions">
            <button className="intro-primary" onClick={onExplore}>Khám phá Drobe <ArrowRight size={18} /></button>
            <button className="intro-secondary" onClick={onLogin}>Đăng nhập để sử dụng</button>
          </div>
          <div className="intro-note"><WandSparkles size={15} /> Xem thử dữ liệu mẫu trước, đăng nhập khi muốn lưu thay đổi.</div>
        </div>

        <div className="intro-stage" aria-label="Bản xem trước tủ đồ Drobe">
          <div className="intro-stage-glow" />
          <div className="intro-card intro-card-back"><span>01</span><strong>YOUR<br />EVERYDAY</strong><small>wardrobe edit</small></div>
          <div className="intro-card intro-card-front"><div className="intro-card-icon"><Shirt size={28} /></div><span>LOOKBOOK</span><strong>Soft<br />Essentials</strong><small>3 pieces · 1 mood</small></div>
          <div className="intro-floating intro-floating-top">NEW SEASON</div>
          <div className="intro-floating intro-floating-bottom">drag · style · save</div>
          <div className="intro-clothing-strip">
            {[
              ['Linen shirt', 'https://images.unsplash.com/photo-1603252110481-7ba873bf42ab?w=500'],
              ['Daily denim', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500'],
              ['White sneaker', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500'],
              ['Soft knit', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500'],
            ].map(([name, image], index) => (
              <div className="intro-clothing-card" key={name} style={{ animationDelay: `${index * -0.7}s` }}>
                <img src={image} alt={name} />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="intro-footer"><span>WARDROBE</span><span>OUTFITS</span><span>TRAVEL</span><span>STYLE NOTES</span></footer>
    </main>
  );
}
