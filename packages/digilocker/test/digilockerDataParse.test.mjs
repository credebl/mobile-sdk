import assert from 'node:assert/strict'
import test from 'node:test'

import { parseAadhaarData, parseDrivingLicenseData, parsePANData } from '../build/digilockerDataParse.mjs'

const AADHAAR_XML = `<?xml version='1.0' encoding='utf-8'?>
<Certificate number='123456789012' issuedAt='2024-01-01' issueDate='2024-01-01' expiryDate='2034-01-01'>
  <CertificateData>
    <KycRes>
      <UidData uid='123412341234'>
        <Poi dob='01/01/1990' gender='M' name='TEST USER'/>
        <Poa co='S/O TEST' country='India' dist='Pune' loc='Wakad' pc='411057' state='Maharashtra' vtc='Pune' house='H1' street='S1' lm='L1' po='PO1'/>
        <Pht>PHOTO-BASE64</Pht>
      </UidData>
    </KycRes>
  </CertificateData>
</Certificate>`

const PAN_XML = `<?xml version='1.0' encoding='utf-8'?>
<Certificate number='ABCDE1234F' issuedAt='2024-01-01' issueDate='2024-01-01' expiryDate='2034-01-01'>
  <IssuedTo>
    <Person name='TEST USER' dob='01/01/1990' gender='M'/>
  </IssuedTo>
</Certificate>`

const DL_XML = `<?xml version='1.0' encoding='utf-8'?>
<Certificate number='MH0120240011223' issuedAt='2024-01-01' issueDate='2024-01-01' expiryDate='2034-01-01'>
  <IssuedTo>
    <Person name='TEST USER' dob='01/01/1990' gender='M' swd='abc' swdIndicator='N'>
      <Address line1='L1' line2='L2' house='H1' landmark='LM' locality='LOC' vtc='VTC' district='Pune' pin='411057' state='Maharashtra' country='India'/>
      <Address2 line1='PL1' line2='PL2' house='PH' landmark='PLM' locality='PLOC' vtc='PVTC' district='PD' pin='411001' state='MH' country='India'/>
      <Photo _=''>DL-PHOTO</Photo>
    </Person>
  </IssuedTo>
  <CertificateData>
    <DrivingLicense>
      <Categories>
        <Category abbreviation='M' />
        <Category abbreviation='LMV' />
      </Categories>
    </DrivingLicense>
  </CertificateData>
</Certificate>`

test('parseAadhaarData maps every field from the XML', async () => {
  const result = await parseAadhaarData(AADHAAR_XML)
  if ('error' in result) {
    assert.fail(`Expected aadhaar data, got: ${result.error}`)
  }
  assert.deepEqual(result, {
    uid: '123412341234',
    dob: '01/01/1990',
    gender: 'M',
    name: 'TEST USER',
    co: 'S/O TEST',
    country: 'India',
    district: 'Pune',
    locality: 'Wakad',
    pincode: '411057',
    state: 'Maharashtra',
    vtc: 'Pune',
    house: 'H1',
    street: 'S1',
    landmark: 'L1',
    postOffice: 'PO1',
    photo: 'PHOTO-BASE64',
  })
})

test('parseAadhaarData returns an error for invalid XML', async () => {
  const result = await parseAadhaarData('<not-xml')
  assert.ok('error' in result)
  assert.match(result.error, /Error parsing Aadhaar XML/)
})

test('parsePANData maps PAN fields from the XML', async () => {
  const result = await parsePANData(PAN_XML)
  if ('error' in result) {
    assert.fail(`Expected PAN data, got: ${result.error}`)
  }
  assert.deepEqual(result, {
    panNumber: 'ABCDE1234F',
    name: 'TEST USER',
    dob: '01/01/1990',
    gender: 'M',
  })
})

test('parsePANData returns an error for invalid XML', async () => {
  const result = await parsePANData('<invalid')
  assert.ok('error' in result)
  assert.match(result.error, /Error parsing PAN XML/)
})

test('parseDrivingLicenseData maps all addresses, categories and photo', async () => {
  const result = await parseDrivingLicenseData(DL_XML)
  if ('error' in result) {
    assert.fail(`Expected driving license data, got: ${result.error}`)
  }
  assert.equal(result.licenseNumber, 'MH0120240011223')
  assert.equal(result.issuedAt, '2024-01-01')
  assert.equal(result.issueDate, '2024-01-01')
  assert.equal(result.expiryDate, '2034-01-01')
  assert.equal(result.dob, '01/01/1990')
  assert.equal(result.name, 'TEST USER')
  assert.equal(result.gender, 'M')
  assert.equal(result.swd, 'abc')
  assert.equal(result.swdIndicator, 'N')
  assert.equal(result.licenseTypes, 'M, LMV')
  assert.equal(result.photo, 'DL-PHOTO')
  assert.equal(result.presentAddressLine1, 'L1')
  assert.equal(result.presentAddressLine2, 'L2')
  assert.equal(result.presentAddressHouse, 'H1')
  assert.equal(result.presentAddressLandmark, 'LM')
  assert.equal(result.presentAddressLocality, 'LOC')
  assert.equal(result.presentAddressVtc, 'VTC')
  assert.equal(result.presentAddressDistrict, 'Pune')
  assert.equal(result.presentAddressPin, '411057')
  assert.equal(result.presentAddressState, 'Maharashtra')
  assert.equal(result.presentAddressCountry, 'India')
  assert.equal(result.permanentAddressLine1, 'PL1')
  assert.equal(result.permanentAddressLine2, 'PL2')
  assert.equal(result.permanentAddressHouse, 'PH')
  assert.equal(result.permanentAddressLandmark, 'PLM')
  assert.equal(result.permanentAddressLocality, 'PLOC')
  assert.equal(result.permanentAddressVtc, 'PVTC')
  assert.equal(result.permanentAddressDistrict, 'PD')
  assert.equal(result.permanentAddressPin, '411001')
  assert.equal(result.permanentAddressState, 'MH')
  assert.equal(result.permanentAddressCountry, 'India')
})

test('parseDrivingLicenseData returns an error for invalid XML', async () => {
  const result = await parseDrivingLicenseData('<invalid')
  assert.ok('error' in result)
  assert.match(result.error, /Error parsing Driving License XML/)
})
