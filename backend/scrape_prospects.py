# backend/scrape_prospects.py
import requests
from bs4 import BeautifulSoup
import json
import time
import re
from datetime import datetime
import sqlite3
import random
from urllib.parse import urljoin, urlencode
import os

class WellengoScraper:
    def __init__(self):
        self.base_url = "https://www.wellengo.com"
        self.search_url = f"{self.base_url}/fr/annuaire"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        }
        self.prospects = []
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
        # Mapping des métiers vers les catégories Wellengo
        self.profession_to_category = {
            'sophrologue': 'sophrologie',
            'naturopathe': 'naturopathie',
            'réflexologue': 'reflexologie',
            'hypnothérapeute': 'hypnose',
            'thérapeute': 'therapeute',
            'psychologue': 'psychologie',
            'psychothérapeute': 'psychotherapie',
            'ostéopathe': 'osteopathie',
            'ostéopathie': 'osteopathie',
            'médecin esthétique': 'esthetique',
            'kinésithérapeute': 'kinesitherapie',
            'masseur-kinésithérapeute': 'massage',
            'nutritionniste': 'nutrition',
            'diététicien': 'dietetique',
            'coach': 'coaching',
            'coach sportif': 'coaching-sportif',
            'coach bien-être': 'coaching-bien_etre',
            'coach personnel': 'coaching-personnel',
            'esthéticienne': 'esthetique',
            'estheticienne': 'esthetique',
            'praticien bien-être': 'praticien-bien_etre',
            'conseiller bien-être': 'conseiller-bien_etre'
        }
        
        # Liste complète des métiers à scraper
        self.target_professions = [
            # Métiers du bien-être et thérapies alternatives
            "sophrologue",
            "naturopathe",
            "réflexologue",
            "hypnothérapeute",
            "thérapeute",
            
            # Métiers de la santé
            "psychologue",
            "psychothérapeute",
            "ostéopathe",
            "kinésithérapeute",
            "masseur-kinésithérapeute",
            "nutritionniste",
            "diététicien",
            
            # Métiers du coaching et du sport
            "coach",
            "coach sportif",
            "coach bien-être",
            "coach personnel",
            
            # Métiers de l'esthétique et du bien-être
            "esthéticienne",
            "estheticienne",
            "praticien bien-être",
            "conseiller bien-être"
        ]
    
    def search_practitioners(self, profession, city="", page=1):
        """Recherche des praticiens sur Wellengo avec pagination"""
        # Utiliser le terme de recherche direct
        search_term = profession
        
        params = {
            'search': search_term,
            'page': page,
            'parPage': 24
        }
        if city:
            params['city'] = city
            
        url = f"{self.search_url}?{urlencode(params)}"
        
        # Implement retry with exponential backoff for rate limiting (HTTP 429)
        max_retries = 5
        for attempt in range(max_retries + 1):
            try:
                print(f"🌐 Recherche (attempt {attempt + 1}): {url}")
                response = self.session.get(url, timeout=15)
                if response.status_code == 429:
                    # Rate limited – wait and retry
                    wait_seconds = min(60, 2 ** attempt)
                    print(f"⏳ Rate limited, waiting {wait_seconds}s before retry...")
                    time.sleep(wait_seconds)
                    continue
                if response.status_code != 200:
                    print(f"❌ Erreur {response.status_code} pour {profession}")
                    return []
                # Successful response
                break
            except Exception as e:
                print(f"❌ Exception during request: {e}")
                if attempt >= max_retries:
                    return []
                time.sleep(min(60, 2 ** attempt))
        else:
            # Exceeded retries without success
            return []
        
        try:
            # Successful response already obtained, parse the content
            soup = BeautifulSoup(response.content, "html.parser")

            # Define selectors (tag, class pattern) – adjust as needed
            selectors = [
                ("div", r"card|result|praticien|profile"),
                ("article", r"card|result|praticien|profile"),
            ]

            practitioners_cards = []
            for tag, pattern in selectors:
                cards = soup.find_all(tag, class_=re.compile(pattern, re.IGNORECASE))
                if cards:
                    practitioners_cards = cards
                    break

            # Si on trouve des liens vers des profils
            if not practitioners_cards:
                profile_links = soup.find_all('a', href=re.compile(r'/fr/(praticien|profil|practitioner|annuaire|p)/[a-z0-9-]+'))
                if profile_links:
                    practitioners_cards = profile_links

            # Vérifier s'il y a des résultats dans un autre format
            if not practitioners_cards:
                name_elements = soup.find_all(['h2', 'h3', 'h4', 'h5'], string=re.compile(r'[A-Z][a-z]+ [A-Z][a-z]+'))
                if name_elements:
                    practitioners_cards = name_elements

            if not practitioners_cards:
                print(f"⚠️ Aucun {profession} trouvé sur cette page")
                return []

            print(f"  📄 {len(practitioners_cards)} résultats trouvés")
            return practitioners_cards
            
        except Exception as e:
            print(f"❌ Erreur lors de la recherche: {e}")
            return []
    
    def extract_practitioner_data(self, card_element, profession):
        """Extrait les données d'un praticien depuis sa carte"""
        try:
            # Si c'est un lien direct vers le profil
            if card_element.name == 'a' and card_element.get('href'):
                profile_link = card_element.get('href')
                name = card_element.text.strip()
                if not name or len(name) < 2:
                    name = profession.capitalize()
                
                # Récupérer les données du profil
                profile_data = self.scrape_profile_page(profile_link)
                
                # Extraire le nom de l'URL si pas de nom
                if not name or name == profession.capitalize():
                    name_match = re.search(r'/([a-z0-9-]+)$', profile_link)
                    if name_match:
                        name = name_match.group(1).replace('-', ' ').title()
                
                return self.build_prospect(name, profession, profile_link, profile_data)
            
            # Si c'est un élément de titre
            if card_element.name in ['h2', 'h3', 'h4', 'h5']:
                name = card_element.text.strip()
                # Chercher un lien autour
                parent_link = card_element.find_parent('a', href=re.compile(r'/fr/'))
                if parent_link:
                    profile_link = parent_link.get('href')
                    profile_data = self.scrape_profile_page(profile_link) if profile_link else {}
                    return self.build_prospect(name, profession, profile_link, profile_data)
                return None
            
            # Extraction depuis une carte complète
            # Nom du praticien
            name_elem = None
            for tag in ['h2', 'h3', 'h4', 'h5', 'strong', 'span', 'a']:
                name_elem = card_element.find(tag, class_=re.compile(r'(name|title|nom|titre|practitioner|profil|heading)', re.IGNORECASE))
                if name_elem:
                    break
            
            if not name_elem:
                # Chercher un lien avec un nom
                name_elem = card_element.find('a', href=re.compile(r'/fr/(praticien|profil|practitioner|annuaire|p)/'))
                
            if not name_elem:
                # Chercher un texte qui ressemble à un nom
                text = card_element.get_text(strip=True)
                # Chercher un nom avec prénom et nom
                name_match = re.search(r'([A-Z][a-zàâäéèêëïîôöùûüÿç]+ [A-Z][a-zàâäéèêëïîôöùûüÿç]+)', text)
                if name_match:
                    name_elem = name_match.group(1)
            
            if not name_elem:
                return None
                
            # Récupérer le nom
            if isinstance(name_elem, str):
                name = name_elem
            else:
                name = name_elem.text.strip()
            
            if not name or len(name) < 2:
                return None
            
            # Nettoyer le nom
            name = self.clean_name(name)
            
            # Lien vers le profil
            profile_link = None
            if not isinstance(name_elem, str):
                if name_elem.name == 'a':
                    profile_link = name_elem.get('href')
            
            if not profile_link:
                link_elem = card_element.find('a', href=re.compile(r'/fr/(praticien|profil|practitioner|annuaire|p)/[a-z0-9-]+'))
                if link_elem:
                    profile_link = link_elem.get('href')
            
            # Ville
            city = ""
            location_elem = card_element.find(class_=re.compile(r'(location|ville|address|city|lieu|adresse|localite|place)', re.IGNORECASE))
            if location_elem:
                city = location_elem.text.strip()
            
            # Si pas de ville, chercher un code postal
            if not city:
                text = card_element.get_text()
                cp_match = re.search(r'\b([0-9]{5})\b', text)
                if cp_match:
                    city_match = re.search(r'([A-Z][a-zàâäéèêëïîôöùûüÿç\s-]+)\s+[0-9]{5}', text)
                    if city_match:
                        city = city_match.group(1).strip()
            
            # Téléphone
            phone = ""
            phone_elem = card_element.find('a', href=re.compile(r'^tel:'))
            if phone_elem:
                phone = phone_elem.get('href').replace('tel:', '').strip()
            
            # Email
            email = ""
            email_elem = card_element.find('a', href=re.compile(r'^mailto:'))
            if email_elem:
                email = email_elem.get('href').replace('mailto:', '').strip()
            
            # Site web
            website = ""
            website_elem = card_element.find('a', href=re.compile(r'^https?://'), class_=re.compile(r'(website|site|web|url)', re.IGNORECASE))
            if website_elem:
                website = website_elem.get('href')
            
            # Récupérer les données du profil
            profile_data = {}
            if profile_link:
                profile_data = self.scrape_profile_page(profile_link)
            
            # Construire le prospect
            return self.build_prospect(name, profession, profile_link, profile_data, {
                'city': city,
                'website': website,
                'email': email,
                'phone': phone
            })
            
        except Exception as e:
            print(f"  ⚠️ Erreur extraction: {e}")
            return None
    
    def build_prospect(self, name, profession, profile_link, profile_data, extra_data=None):
    is_hot = False
    description = profile_data.get('description', '').lower()
    services = ' '.join(profile_data.get('services', [])).lower()
    hot_keywords = ['online booking', 'réservation en ligne', 'booking']
    if any(k in description for k in hot_keywords) or any(k in services for k in hot_keywords):
        is_hot = True
    if profile_data.get('has_online_booking'):
        is_hot = True

    prospect = {
        "company_name": name,
        "profession": profession,
        "specialty": profession.capitalize(),
        "city": extra_data.get('city', profile_data.get('city', '')),
        "website": extra_data.get('website', profile_data.get('website', '')),
        "email": extra_data.get('email', profile_data.get('email', '')),
        "phone": extra_data.get('phone', profile_data.get('phone', '')),
        "address": profile_data.get('address', ''),
        "description": profile_data.get('description', ''),
        "social_media": profile_data.get('social_media', {}),
        "services": profile_data.get('services', []),
        "qualifications": profile_data.get('qualifications', []),
        "experience": profile_data.get('experience', ''),
        "languages": profile_data.get('languages', []),
        "company_size": self.estimate_size(profession),
        "revenue": self.estimate_revenue(profession, extra_data.get('city', '')),
        "growth_rate": self.estimate_growth(profession),
        "new_projects": self.identify_projects(profile_data, profession),
        "recent_hires": self.identify_hires(profile_data, profession),
        "status": "new",
        "source": "wellengo",
        "profile_url": urljoin(self.base_url, profile_link) if profile_link else "",
        "scraped_at": datetime.now().isoformat(),
        "has_online_booking": is_hot,
        "booking_system_detected": "Oui" if is_hot else "Aucun",
# Legacy build_prospect removed
    
    def scrape_profile_page(self, profile_url):
        """Scrape la page de profil détaillée d'un praticien"""
        try:
            if not profile_url:
                return {}
                
            if not profile_url.startswith('http'):
                profile_url = urljoin(self.base_url, profile_url)
            
            print(f"  📄 Profil: {profile_url}")
            response = self.session.get(profile_url, timeout=10)
            if response.status_code != 200:
                return {}
            
            soup = BeautifulSoup(response.content, 'html.parser')
            data = {}
            
            # Description
            desc_elem = soup.find('div', class_=re.compile(r'(description|presentation|about|biographie|bio|presentation)', re.IGNORECASE))
            if desc_elem:
                data['description'] = desc_elem.text.strip()
            
            # Services
            services_elem = soup.find('div', class_=re.compile(r'(services|prestations|activites|offres|prestation)', re.IGNORECASE))
            if services_elem:
                services_items = services_elem.find_all(['li', 'span', 'div'])
                data['services'] = [s.text.strip() for s in services_items[:10] if s.text.strip()]
            
            # Contact
            contact_section = soup.find('div', class_=re.compile(r'(contact|infos|informations|coordonnees|info)', re.IGNORECASE))
            if contact_section:
                email_elem = contact_section.find('a', href=re.compile(r'^mailto:'))
                if email_elem:
                    data['email'] = email_elem.get('href').replace('mailto:', '').strip()
                
                phone_elem = contact_section.find('a', href=re.compile(r'^tel:'))
                if phone_elem:
                    data['phone'] = phone_elem.get('href').replace('tel:', '').strip()
                
                website_elem = contact_section.find('a', href=re.compile(r'^https?://'))
                if website_elem:
                    data['website'] = website_elem.get('href')
                
                address_elem = contact_section.find('span', class_=re.compile(r'(address|adresse|lieu|location)', re.IGNORECASE))
                if address_elem:
                    data['address'] = address_elem.text.strip()
                    # Extraire la ville de l'adresse
                    city_match = re.search(r'([A-Z][a-zàâäéèêëïîôöùûüÿç\s-]+)\s+[0-9]{5}', data['address'])
                    if city_match:
                        data['city'] = city_match.group(1).strip()
            
            # Réseaux sociaux
            social_links = soup.find_all('a', href=re.compile(r'(facebook|instagram|linkedin|twitter|x\.com|youtube|tiktok)', re.IGNORECASE))
            social_media = {}
            for link in social_links:
                href = link.get('href', '')
                if 'facebook' in href.lower():
                    social_media['facebook'] = href
                elif 'instagram' in href.lower():
                    social_media['instagram'] = href
                elif 'linkedin' in href.lower():
                    social_media['linkedin'] = href
                elif 'twitter' in href.lower() or 'x.com' in href.lower():
                    social_media['twitter'] = href
            data['social_media'] = social_media
            
            return data
            
        except Exception as e:
            return {}
    
    def scrape_practitioners(self, city="", specialty="", target_total=1000):
        """Scrape les praticiens pour tous les métiers ciblés"""
        print("=" * 60)
        print("Scraping Wellengo - Extraction des praticiens")
        print("=" * 60)
        print(f"Metiers cibles: {len(self.target_professions)} professions")
        print(f"Ville: {city or 'Toutes'}")
        print(f"Specialite: {specialty or 'Toutes'}")
        print("=" * 60)
        
        if specialty:
            professions = [specialty] if specialty in self.target_professions else self.target_professions
        else:
            professions = self.target_professions
        
        all_prospects = []
        total_found = 0
        success_professions = []
        
        for idx, profession in enumerate(professions, 1):
            print(f"\n📌 [{idx}/{len(professions)}] Scraping des {profession}s...")
            
            page = 1
            profession_found = 0
            
            # Continue fetching pages until we reach the global target_total or no more results
            while total_found < target_total:
                practitioners_cards = self.search_practitioners(profession, city, page)
                
                if not practitioners_cards:
                    break
                
                # Process all cards on this page (no per‑page limit now)
                for card in practitioners_cards:
                    # Stop if we already reached the overall target
                    if total_found >= target_total:
                        break
                    
                    prospect = self.extract_practitioner_data(card, profession)
                    if prospect:
                        # Vérifier les doublons par nom et ville
                        is_duplicate = any(
                            existing['company_name'].lower() == prospect['company_name'].lower() and
                            existing['city'].lower() == prospect['city'].lower()
                            for existing in all_prospects
                        )
                        
                        if not is_duplicate:
                            all_prospects.append(prospect)
                            profession_found += 1
                            total_found += 1
                            print(f"  ✅ {prospect['company_name']} - {prospect['profession']} ({prospect['city'] or 'Non spécifié'})")
                            
                            if prospect.get('email'):
                                print(f"     📧 {prospect['email']}")
                            if prospect.get('phone'):
                                print(f"     📞 {prospect['phone']}")
                    
                    time.sleep(random.uniform(0.3, 0.6))
                
                if total_found >= target_total:
                    break
                    
                page += 1
                time.sleep(random.uniform(1, 2))
            
            if profession_found > 0:
                success_professions.append(profession)
                print(f"📊 {profession_found} {profession}s trouvés")
            else:
                print(f"⚠️ Aucun {profession} trouvé")
            
            time.sleep(random.uniform(1, 2))
        
        self.prospects = all_prospects
        
        # Résumé
        print("\n" + "=" * 60)
        print("📊 RÉSUMÉ DU SCRAPING")
        print("=" * 60)
        print(f"✅ Professions avec résultats: {len(success_professions)}/{len(professions)}")
        if success_professions:
            print(f"   {', '.join(success_professions)}")
        print(f"🎯 Total prospects extraits: {total_found}")
        print("=" * 60)
        
        return self.prospects
    
    def clean_name(self, name):
        """Nettoie le nom du praticien"""
        if not name:
            return ""
        name = re.sub(r'^(Dr|Mme|M\.|Mlle|Pr|Docteur|Docteure|Cabinet|Centre)\s+', '', name, flags=re.IGNORECASE)
        name = re.sub(r'\s*\(.*?\)', '', name)
        name = re.sub(r'\s*[-–]\s*.*$', '', name)
        name = re.sub(r'["\']', '', name)
        name = ' '.join(name.split())
        return name.strip()
    
    def estimate_size(self, profession):
        """Estime la taille de l'entreprise"""
        sizes = {
            'sophrologue': 1, 'naturopathe': 1, 'réflexologue': 1,
            'hypnothérapeute': 1, 'thérapeute': 1, 'psychologue': 1,
            'psychothérapeute': 1, 'ostéopathe': 1, 'kinésithérapeute': 2,
            'masseur-kinésithérapeute': 2, 'nutritionniste': 1, 'diététicien': 1,
            'coach': 1, 'coach sportif': 2, 'coach bien-être': 1,
            'coach personnel': 1, 'esthéticienne': 2, 'estheticienne': 2,
            'praticien bien-être': 1, 'conseiller bien-être': 1
        }
        return sizes.get(profession, 1)
    
    def estimate_revenue(self, profession, city):
        """Estime le revenu"""
        base_revenue = {
            'sophrologue': 45000, 'naturopathe': 50000, 'réflexologue': 42000,
            'hypnothérapeute': 48000, 'thérapeute': 46000, 'psychologue': 58000,
            'psychothérapeute': 55000, 'ostéopathe': 75000, 'kinésithérapeute': 85000,
            'masseur-kinésithérapeute': 70000, 'nutritionniste': 52000, 'diététicien': 48000,
            'coach': 65000, 'coach sportif': 58000, 'coach bien-être': 50000,
            'coach personnel': 55000, 'esthéticienne': 42000, 'estheticienne': 42000,
            'praticien bien-être': 45000, 'conseiller bien-être': 40000
        }
        
        base = base_revenue.get(profession, 50000)
        city_lower = city.lower() if city else ""
        
        if 'paris' in city_lower:
            base = int(base * 1.5)
        elif any(c in city_lower for c in ['lyon', 'nice', 'marseille', 'bordeaux']):
            base = int(base * 1.2)
        elif any(c in city_lower for c in ['toulouse', 'montpellier']):
            base = int(base * 1.1)
        
        return int(base * random.uniform(0.9, 1.1))
    
    def estimate_growth(self, profession):
        """Estime le taux de croissance"""
        growth = {
            'sophrologue': 0.18, 'naturopathe': 0.20, 'réflexologue': 0.16,
            'hypnothérapeute': 0.17, 'thérapeute': 0.15, 'psychologue': 0.10,
            'psychothérapeute': 0.12, 'ostéopathe': 0.12, 'kinésithérapeute': 0.08,
            'masseur-kinésithérapeute': 0.10, 'nutritionniste': 0.18, 'diététicien': 0.15,
            'coach': 0.22, 'coach sportif': 0.20, 'coach bien-être': 0.18,
            'coach personnel': 0.20, 'esthéticienne': 0.12, 'estheticienne': 0.12,
            'praticien bien-être': 0.15, 'conseiller bien-être': 0.14
        }
        return growth.get(profession, 0.15)
    
    def identify_projects(self, profile_data, profession):
        """Identifie les projets potentiels"""
        description = profile_data.get('description', '').lower()
        projects = []
        
        keywords = {
            'nouveau': 'Nouveau projet en développement',
            'lancement': 'Lancement de nouveaux services',
            'développement': 'Développement des activités',
            'expansion': 'Expansion du cabinet',
            'partenariat': 'Création de nouveaux partenariats',
            'formation': 'Développement de formations',
            'application': 'Création d\'application mobile',
            'digital': 'Développement d\'outils digitaux'
        }
        
        for keyword, project in keywords.items():
            if keyword in description:
                projects.append(project)
        
        if not projects:
            projects = [self.default_project(profession)]
        
        return projects
    
    def default_project(self, profession):
        """Projet par défaut"""
        projects = {
            'sophrologue': 'Développement de séances de sophrologie en ligne',
            'naturopathe': 'Création de programmes de naturopathie personnalisés',
            'réflexologue': 'Développement de nouvelles techniques de réflexologie',
            'hypnothérapeute': 'Lancement de séances d\'hypnothérapie à distance',
            'thérapeute': 'Développement de nouvelles approches thérapeutiques',
            'psychologue': 'Ouverture de nouveaux créneaux de consultation',
            'ostéopathe': 'Expansion du cabinet avec nouveaux équipements',
            'kinésithérapeute': 'Modernisation du cabinet',
            'nutritionniste': 'Création de programmes nutritionnels personnalisés',
            'coach': 'Lancement d\'un programme de coaching digital',
            'coach sportif': 'Développement de programmes sportifs en ligne',
            'esthéticienne': 'Introduction de nouvelles prestations esthétiques'
        }
        return projects.get(profession, 'Développement des activités')
    
    def identify_hires(self, profile_data, profession):
        """Identifie les recrutements potentiels"""
        description = profile_data.get('description', '').lower()
        hires = []
        
        keywords = {
            'recrute': 'Recrutement en cours',
            'cherche': 'Recherche de collaborateurs',
            'embauche': 'Embauche de nouveaux talents',
            'équipe': 'Élargissement de l\'équipe',
            'assistant': 'Recherche d\'assistant(e)'
        }
        
        for keyword, hire in keywords.items():
            if keyword in description:
                hires.append(hire)
        
        if not hires:
            hires = [self.default_hire(profession)]
        
        return hires
    
    def default_hire(self, profession):
        """Recrutement par défaut"""
        hires = {
            'sophrologue': 'Recrutement d\'un(e) sophrologue',
            'naturopathe': 'Recrutement d\'un(e) naturopathe',
            'réflexologue': 'Recrutement d\'un(e) réflexologue',
            'hypnothérapeute': 'Recrutement d\'un(e) hypnothérapeute',
            'thérapeute': 'Recrutement d\'un(e) thérapeute',
            'psychologue': 'Recrutement d\'un(e) psychologue',
            'ostéopathe': 'Recrutement d\'un(e) ostéopathe',
            'kinésithérapeute': 'Recrutement d\'un(e) kinésithérapeute',
            'nutritionniste': 'Recrutement d\'un(e) nutritionniste',
            'coach': 'Recrutement d\'un(e) coach',
            'coach sportif': 'Recrutement d\'un coach sportif',
            'esthéticienne': 'Recrutement d\'une esthéticienne'
        }
        return hires.get(profession, 'Recrutement de nouveaux collaborateurs')
    
    def save_to_db(self):
        """Sauvegarde les prospects dans la base de données - EFFACE LES ANCIENS"""
        db_path = 'sales_agent.db'
        
        # Vérifier si la base existe
        if os.path.exists(db_path):
            # Sauvegarder l'ancienne base
            backup_path = f'sales_agent_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db'
            try:
                import shutil
                shutil.copy2(db_path, backup_path)
                print(f"💾 Base sauvegardée: {backup_path}")
            except:
                pass
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Supprimer les anciens prospects
        cursor.execute("DELETE FROM prospects")
        print("🗑️ Anciens prospects supprimés")
        
        # Créer la table si elle n'existe pas
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS prospects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_name TEXT,
                profession TEXT,
                specialty TEXT,
                city TEXT,
                website TEXT,
                email TEXT,
                phone TEXT,
                address TEXT,
                description TEXT,
                social_media TEXT,
                services TEXT,
                qualifications TEXT,
                experience TEXT,
                languages TEXT,
                company_size INTEGER,
                revenue INTEGER,
                growth_rate REAL,
                new_projects TEXT,
                recent_hires TEXT,
                status TEXT,
                source TEXT,
                profile_url TEXT,
                scraped_at TEXT,
                created_at TEXT,
                updated_at TEXT,
                has_online_booking INTEGER DEFAULT 0,
                booking_system_detected TEXT,
                is_hot INTEGER DEFAULT 0,
                score REAL DEFAULT 0,
                lead_priority TEXT DEFAULT 'cold'
            )
        """)
        
        added = 0
        for prospect in self.prospects:
            try:
                cursor.execute("""
                    INSERT INTO prospects (
                        company_name, profession, specialty, city, website, email, phone,
                        address, description, social_media, services, qualifications,
                        experience, languages, company_size, revenue, growth_rate,
                        new_projects, recent_hires, status, source, profile_url,
                        scraped_at, created_at, updated_at, has_online_booking,
                        booking_system_detected, is_hot, score, lead_priority
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    prospect['company_name'],
                    prospect['profession'],
                    prospect['specialty'],
                    prospect['city'],
                    prospect['website'],
                    prospect['email'],
                    prospect['phone'],
                    prospect.get('address', ''),
                    prospect.get('description', ''),
                    json.dumps(prospect.get('social_media', {})),
                    json.dumps(prospect.get('services', [])),
                    json.dumps(prospect.get('qualifications', [])),
                    prospect.get('experience', ''),
                    json.dumps(prospect.get('languages', [])),
                    prospect['company_size'],
                    prospect['revenue'],
                    prospect['growth_rate'],
                    json.dumps(prospect.get('new_projects', [])),
                    json.dumps(prospect.get('recent_hires', [])),
                    prospect['status'],
                    prospect['source'],
                    prospect.get('profile_url', ''),
                    prospect['scraped_at'],
                    datetime.now().isoformat(),
                    datetime.now().isoformat(),
                    prospect.get('has_online_booking', 0),
                    prospect.get('booking_system_detected', 'Aucun'),
                    prospect.get('is_hot', 0),
                    prospect.get('score', 0),
                    prospect.get('lead_priority', 'cold')
                ))
                added += 1
            except Exception as e:
                print(f"❌ Erreur insertion {prospect['company_name']}: {e}")
        
        conn.commit()
        conn.close()
        print(f"✅ {added} nouveaux prospects ajoutés à la base de données (anciens supprimés)")
        return added

def main():
    scraper = WellengoScraper()
    
    print("\n" + "=" * 60)
    print("🔄 SCRAPING WELLENGO - Extraction des données réelles")
    print("=" * 60)
    print("Métiers ciblés:")
    for i, prof in enumerate(scraper.target_professions, 1):
        print(f"  {i:2d}. {prof}")
    print("=" * 60)
    
    city = input("Ville (laisser vide pour toutes): ").strip()
    specialty = input("Spécialité spécifique (laisser vide pour toutes): ").strip()
    target_total = input("Nombre total de prospects souhaités (défaut: 1000): ").strip()
    target_total = int(target_total) if target_total else 1000
    
    prospects = scraper.scrape_practitioners(city, specialty, target_total)
    
    if prospects:
        print(f"\n📊 {len(prospects)} prospects extraits au total")
        
        print("\n📋 Aperçu des prospects (10 premiers):")
        print("-" * 60)
        for i, p in enumerate(prospects[:10], 1):
            print(f"{i:2d}. {p['company_name']}")
            print(f"    🏷️  {p['profession']} - {p['specialty']}")
            print(f"    📍 {p['city'] or 'Non spécifié'}")
            if p.get('email'):
                print(f"    📧 {p['email']}")
            if p.get('phone'):
                print(f"    📞 {p['phone']}")
            if p.get('website'):
                print(f"    🌐 {p['website']}")
            print()
        
        save = input("\n💾 Sauvegarder dans la base de données? (o/n): ").strip().lower()
        if save == 'o':
            scraper.save_to_db()
            
            print("\n🔄 Lancement du scoring IA...")
            try:
                import requests
                response = requests.post("http://localhost:8000/api/calls/scoring", timeout=5)
                if response.status_code in [200, 202]:
                    print("✅ Scoring déclenché avec succès !")
                else:
                    print(f"⚠️ Scoring: {response.status_code}")
            except:
                print("⚠️ Scoring non déclenché (backend non accessible)")
    else:
        print("❌ Aucun prospect trouvé")

if __name__ == "__main__":
    main()